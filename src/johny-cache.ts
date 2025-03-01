import Redis from 'ioredis';
import {
  CacheSetting,
  LockCacheSettings,
  LockerOptions,
} from './cache-settings';
import {
  CACHE_DELETE_NOTIFICATION_EVENT,
  CACHE_REFRESH_NOTIFICATION_EVENT,
} from './redis/redis-events';
import { LocalCacheService } from './local-cache/local-cache.service';
import Redlock, { Lock } from 'redlock';
import { RedisPubSubService } from './redis/redis-pub-sub.service';
import { Logger } from './logger';
import { RedisConfig } from './redis/redis-config';
import { parseRedisConnectionString } from './redis/redis-conig-parser';
import { RedisCacheService } from './redis/redis-cache.service';

export class JohnyCacheService {
  // based on instanceId we can invalidate/refresh remote cache keys
  private instanceId: string = Math.random().toString(36).substring(7);

  // simple logger
  private logger: any;

  // cache services
  private memoryCache: LocalCacheService;
  private redis: Redis;
  private redisPubSubServices: RedisPubSubService;

  // redis caching service
  private redisCache: RedisCacheService;

  // locker service
  private redlock: Redlock;
  private defaultLockOptions: LockerOptions = {
    retryCount: 1,
    retryDelay: 100,
    retryJitter: 50,
  };
  private defaultRedlock: Redlock;

  constructor(
    redisConnectionString: string,
    logger?: Logger,
    defaultLockOptions?: LockerOptions,
  ) {
    // Use provided logger or fallback to console-based logger.
    this.logger = logger || new Logger();

    if (defaultLockOptions) {
      this.defaultLockOptions = {
        ...this.defaultLockOptions,
        ...defaultLockOptions,
      };
    }

    // Parse the connection string into a Redis config object.
    const redisConfig: RedisConfig = parseRedisConnectionString(
      redisConnectionString,
    );

    // Initialize Redis client.
    this.redis = new Redis(redisConfig);

    // Initialize local in-memory cache service.
    this.memoryCache = new LocalCacheService();

    // Initialize remote/redis cache service.
    this.redisCache = new RedisCacheService(this.redis);

    // Initialize Redis Pub/Sub service with the same configuration.
    this.redisPubSubServices = new RedisPubSubService(redisConfig);

    // Initialize the redlock instance using the Redis client.
    this.defaultRedlock = new Redlock([this.redis], this.defaultLockOptions);
  }

  async set(cacheSettings: CacheSetting, value: any): Promise<void> {
    let promises = [];
    if (cacheSettings.localTtl) {
      promises.push(
        this.memoryCache.setCacheValue(
          cacheSettings.getKey(),
          value,
          cacheSettings.localTtl,
        ),
      );
    }
    if (cacheSettings.remoteTtl) {
      promises.push(
        this.redisCache.set(
          cacheSettings.getKey(),
          value,
          cacheSettings.remoteTtl,
        ),
      );
    }

    await Promise.all(promises);

    if (cacheSettings.remoteTtl && cacheSettings.refreshTtl) {
      await this.sendRefreshRemoteKeysEvent(
        [cacheSettings.getKey()],
        cacheSettings.remoteTtl,
      );
    }
  }

  async get(cacheSettings: CacheSetting): Promise<any> {
    const memoryValue = await this.memoryCache.getCacheValue(
      cacheSettings.getKey(),
    );
    if (memoryValue !== undefined) {
      return memoryValue;
    }
    const redisValue = await this.redisCache.get(cacheSettings.getKey());
    return redisValue === undefined ? null : redisValue;
  }

  async deleteMulti(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map(async (key) => {
        await this.deleteByKey(key);
      }),
    );
  }

  async deleteByKey(key: string, localTtl?: number): Promise<void> {
    if (!localTtl) {
      await this.redisCache.delete(key);
      return;
    }

    await Promise.all([
      this.memoryCache.deleteCacheKey(key),
      this.redisCache.delete(key),
      this.sendDeleteRemoteKeysEvent([key]),
    ]);
  }

  async delete(cacheSettings: CacheSetting): Promise<void> {
    if (!cacheSettings.localTtl) {
      await this.redisCache.delete(cacheSettings.getKey());
      return;
    }

    await Promise.all([
      this.memoryCache.deleteCacheKey(cacheSettings.getKey()),
      this.redisCache.delete(cacheSettings.getKey()),
      this.sendDeleteRemoteKeysEvent([cacheSettings.getKey()]),
    ]);
  }

  async getOrSetCache<T>(
    cacheSettings: CacheSetting,
    promise: () => Promise<T>,
    forceRefresh?: boolean,
  ): Promise<T> {
    let value = await this.get(cacheSettings);

    if (!value || forceRefresh) {
      value = await promise();
      await this.set(cacheSettings, value);
    }

    return value;
  }

  // Locker mechanism
  //   async acquireLock(cacheSettings: CacheSetting): Promise<Lock | null> {
  //     try {
  //       return await this.redlock.acquire(
  //         [cacheSettings.key],
  //         cacheSettings.remoteTtl,
  //       );
  //     } catch (error) {
  //       this.logger.error(
  //         `Failed to acquire lock for key: ${cacheSettings.key}`,
  //         error,
  //       );
  //       return null;
  //     }
  //   }

  async acquireLock(cacheSettings: LockCacheSettings): Promise<Lock | null> {
    const lockOptions = {
      ...this.defaultLockOptions,
      ...(cacheSettings.lockOptions || {}),
    };

    let redlockToUse: Redlock;
    if (
      lockOptions.retryCount === this.defaultLockOptions.retryCount &&
      lockOptions.retryDelay === this.defaultLockOptions.retryDelay &&
      lockOptions.retryJitter === this.defaultLockOptions.retryJitter
    ) {
      redlockToUse = this.defaultRedlock;
    } else {
      redlockToUse = new Redlock([this.redis], lockOptions);
    }

    try {
      return await redlockToUse.acquire(
        [cacheSettings.getKey()],
        cacheSettings.remoteTtl,
      );
    } catch (error) {
      return null;
    }
  }

  async releaseLock(lock: Lock): Promise<void> {
    try {
      await lock.release();
    } catch (error) {
      // ignore
      // this.logger.error(`Failed to release lock`, error);
    }
  }

  // SEND REMOTE PUB/SUB EVENTS - INVALIDATION/REFRESH CACHE EVENTS
  async sendDeleteRemoteKeysEvent(keys: string[]): Promise<void> {
    try {
      await this.redisPubSubServices.publish(CACHE_DELETE_NOTIFICATION_EVENT, {
        keys,
        instanceId: this.instanceId,
      });
    } catch (error) {
      this.logger.error(error);
    }
  }

  async sendRefreshRemoteKeysEvent(keys: string[], ttl: number): Promise<void> {
    try {
      await this.redisPubSubServices.publish(CACHE_REFRESH_NOTIFICATION_EVENT, {
        keys,
        ttl,
        instanceId: this.instanceId,
      });
    } catch (error) {
      this.logger.error(error);
    }
  }

  // HANDLE PUB/SUB EVENTS
  async handleDeleteRemoteKeysEvent(event: any) {
    if (event.instanceId === this.instanceId) {
      return;
    }
    // this.logger.log('handleDeleteRemoteKeysEvent', keys);
    for (const key of event.keys) {
      if (key.includes('*')) {
        this.logger.warn('Pattern should not exist in local memory? "*"...');
      }
      await this.memoryCache.deleteCacheKey(key);
    }
  }

  async handleRefreshRemoteKeysEvent(event: any) {
    if (event.instanceId === this.instanceId) {
      return;
    }

    let promises = [];
    // this.logger.log('handleRefreshRemoteKeysEvent', event);

    for (const key of event.keys) {
      if (key.includes('*')) {
        //
        this.logger.warn('Pattern should not exist in local memory? "*"...');
      }
      promises.push(this.memoryCache.refreshCacheLocalTtl(key, event.ttl));
    }
    await Promise.all(promises);
  }
}
