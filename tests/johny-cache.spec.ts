import { JohnyCacheService } from '../src/johny-cache';
import {
  CacheSetting,
  LockCacheSettings,
  LockerOptions,
} from '../src/cache-settings';
import { Lock } from 'redlock';
import { Constants } from '../src/constants';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379/0';

describe('JohnyCacheService', () => {
  let johnyCacheService: JohnyCacheService;
  let johnyCacheService2: JohnyCacheService;

  beforeAll(() => {
    // Initialize the service with just a Redis connection string.
    johnyCacheService = new JohnyCacheService(redisUrl);
    johnyCacheService2 = new JohnyCacheService(redisUrl);
  });

  afterAll(async () => {
    // Cleanup: flush all keys from Redis and disconnect.
    await (johnyCacheService as any).redis.flushall();
    (johnyCacheService as any).redis.disconnect();

    await (johnyCacheService2 as any).redis.flushall();
    (johnyCacheService2 as any).redis.disconnect();
  });

  test('should set and get a cache value', async () => {
    const cacheSettings = new CacheSetting({
      prefix: 'test',
      suffix: 'key',
      localTtl: 5 * Constants.oneSecond(),
      remoteTtl: 10 * Constants.oneSecond(),
      refreshTtl: true,
    });
    const value = { data: 'hello world' };

    await johnyCacheService.set(cacheSettings, value);
    const retrieved = await johnyCacheService.get(cacheSettings);
    expect(retrieved).toEqual(value);
  });

  test('should delete a cache key', async () => {
    const cacheSettings = new CacheSetting({
      prefix: 'test',
      suffix: 'delete',
      localTtl: 5 * Constants.oneSecond(),
      remoteTtl: 10 * Constants.oneSecond(),
      refreshTtl: false,
    });
    const value = 'delete me';

    // Set value in cache.
    await johnyCacheService.set(cacheSettings, value);
    let retrieved = await johnyCacheService.get(cacheSettings);
    expect(retrieved).toEqual(value);

    // Delete the cache key.
    await johnyCacheService.delete(cacheSettings);
    retrieved = await johnyCacheService.get(cacheSettings);
    expect(retrieved).toBeNull();
  });

  test('should getOrSetCache correctly', async () => {
    const cacheSettings = new CacheSetting({
      prefix: 'test',
      suffix: 'getorset',
      localTtl: 5 * Constants.oneSecond(),
      remoteTtl: 10 * Constants.oneSecond(),
      refreshTtl: false,
    });

    // First call should execute the promise as cache is empty.
    const firstResult = await johnyCacheService.getOrSetCache(
      cacheSettings,
      async () => {
        return { id: 1, name: 'John Doe' };
      },
    );
    expect(firstResult).toEqual({ id: 1, name: 'John Doe' });

    // Second call should return the cached value.
    const secondResult = await johnyCacheService.getOrSetCache(
      cacheSettings,
      async () => {
        return { id: 2, name: 'Jane Doe' };
      },
    );
    expect(secondResult).toEqual({ id: 1, name: 'John Doe' });
  });

  test('should acquire and release a lock', async () => {
    const lockCacheSettings = new LockCacheSettings({
      prefix: 'test',
      suffix: 'lock',
      remoteTtl: 2 * Constants.oneSecond(),
      lockOptions: new LockerOptions({
        retryCount: 3,
        retryDelay: 50,
        retryJitter: 10,
      }),
    });

    const lock: Lock | null =
      await johnyCacheService.acquireLock(lockCacheSettings);
    expect(lock).toBeDefined();

    if (lock) {
      // Release the acquired lock.
      await expect(
        johnyCacheService.releaseLock(lock),
      ).resolves.toBeUndefined();
    }
  });

  test('should expire a lock gracefully', async () => {
    const lockCacheSettings = new LockCacheSettings({
      prefix: 'test',
      suffix: 'lock-expire',
      remoteTtl: Constants.oneSecond(),
      lockOptions: new LockerOptions({
        retryCount: 3,
        retryDelay: 50,
        retryJitter: 10,
      }),
    });

    const lock = await johnyCacheService.acquireLock(lockCacheSettings);
    expect(lock).toBeDefined();

    if (lock) {
      // Wait for the lock to expire.
      await new Promise((resolve) => setTimeout(resolve, 1500));
      // Even if the lock is expired, releaseLock should handle the error internally.
      await expect(
        johnyCacheService.releaseLock(lock),
      ).resolves.toBeUndefined();
    }
  });

  test('should expire in memory cache', async () => {
    const cacheSettings = new CacheSetting({
      prefix: 'test',
      suffix: 'expire-memory',
      localTtl: Constants.oneSecond(),
      refreshTtl: false,
    });
    const value = { data: 'hello memory' };

    await johnyCacheService.set(cacheSettings, value);
    let retrieved = await johnyCacheService.get(cacheSettings);
    expect(retrieved).toEqual(value);

    // Wait for the memory cache to expire.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    retrieved = await johnyCacheService.get(cacheSettings);
    expect(retrieved).toBeNull();
  });

  test('should expire remote cache', async () => {
    const cacheSettings = new CacheSetting({
      prefix: 'test',
      suffix: 'expire-remote',
      remoteTtl: Constants.oneSecond(),
      refreshTtl: false,
    });
    const value = { data: 'hello remote' };

    await johnyCacheService.set(cacheSettings, value);
    let retrieved = await johnyCacheService.get(cacheSettings);
    expect(retrieved).toEqual(value);

    // Wait for the remote cache to expire.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    retrieved = await johnyCacheService.get(cacheSettings);
    expect(retrieved).toBeNull();
  });

  test('multiple instances should work', async () => {
    const cacheSettings = new CacheSetting({
      prefix: 'test',
      suffix: 'multiple-instances',
      remoteTtl: Constants.oneSecond(),
    });
    const value = { data: 'hello invalidation' };

    await johnyCacheService.set(cacheSettings, value);
    let retrieved = await johnyCacheService2.get(cacheSettings);
    expect(retrieved).toEqual(value);
  });

  test('cache invalidation should work', async () => {
    const cacheSettings = new CacheSetting({
      prefix: 'test',
      suffix: 'invalidation',
      remoteTtl: 10 * Constants.oneSecond(),
      localTtl: 5 * Constants.oneSecond(),
    });
    const value = { data: 'hello invalidation' };

    await johnyCacheService.set(cacheSettings, value);
    let retrieved = await johnyCacheService.get(cacheSettings);
    expect(retrieved).toEqual(value);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const newValue = { data: 'hello new value' };
    await johnyCacheService2.set(cacheSettings, newValue);
    let retrievd2 = await johnyCacheService.get(cacheSettings);
    expect(retrievd2).toEqual(newValue);
  });
});
