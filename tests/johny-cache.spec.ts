import { JohnyCacheService } from '../src/johny-cache';
import {
  CacheSetting,
  LockCacheSettings,
  LockerOptions,
} from '../src/cache-settings';
import { Lock } from 'redlock';
import { Constants } from '../src/constants';

const redisUrl = 'redis://127.0.0.1:6379/0';

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

  describe('deleteByPattern', () => {
    const bothTtl = (prefix: string, suffix: string) =>
      new CacheSetting({
        prefix,
        suffix,
        localTtl: 10 * Constants.oneSecond(),
        remoteTtl: 10 * Constants.oneSecond(),
        refreshTtl: false,
      });

    test('deletes matching keys in both layers, leaves non-matching intact', async () => {
      await johnyCacheService.set(bothTtl('pat-a', 'u1'), 'v1');
      await johnyCacheService.set(bothTtl('pat-a', 'u2'), 'v2');
      await johnyCacheService.set(bothTtl('pat-b', 'x'), 'other');

      await johnyCacheService.deleteByPattern(
        new CacheSetting({
          prefix: 'pat-a',
          suffix: '*',
          localTtl: 10 * Constants.oneSecond(),
          remoteTtl: 10 * Constants.oneSecond(),
        }),
      );

      expect(await johnyCacheService.get(bothTtl('pat-a', 'u1'))).toBeNull();
      expect(await johnyCacheService.get(bothTtl('pat-a', 'u2'))).toBeNull();
      expect(await johnyCacheService.get(bothTtl('pat-b', 'x'))).toEqual(
        'other',
      );
    });

    test('? wildcard matches exactly one character', async () => {
      await johnyCacheService.set(bothTtl('pat-q', 'a'), '1');
      await johnyCacheService.set(bothTtl('pat-q', 'ab'), '2');

      await johnyCacheService.deleteByPattern(
        new CacheSetting({
          prefix: 'pat-q',
          suffix: '?',
          localTtl: 10 * Constants.oneSecond(),
          remoteTtl: 10 * Constants.oneSecond(),
        }),
      );

      expect(await johnyCacheService.get(bothTtl('pat-q', 'a'))).toBeNull();
      expect(await johnyCacheService.get(bothTtl('pat-q', 'ab'))).toEqual('2');
    });

    test('only localTtl: clears memory but leaves redis intact', async () => {
      await johnyCacheService.set(bothTtl('pat-local', 'k'), 'still-in-redis');

      await johnyCacheService.deleteByPattern(
        new CacheSetting({
          prefix: 'pat-local',
          suffix: '*',
          localTtl: 10 * Constants.oneSecond(),
        }),
      );

      // redis still has it — get() will miss memory and fall through to redis
      expect(await johnyCacheService.get(bothTtl('pat-local', 'k'))).toEqual(
        'still-in-redis',
      );
    });

    test('only remoteTtl: clears redis but leaves memory intact', async () => {
      await johnyCacheService.set(
        bothTtl('pat-remote', 'k'),
        'still-in-memory',
      );

      await johnyCacheService.deleteByPattern(
        new CacheSetting({
          prefix: 'pat-remote',
          suffix: '*',
          remoteTtl: 10 * Constants.oneSecond(),
        }),
      );

      // memory still has it — get() hits memory first
      expect(await johnyCacheService.get(bothTtl('pat-remote', 'k'))).toEqual(
        'still-in-memory',
      );
      // verify redis side is actually cleared
      const directRedis = await (
        johnyCacheService as any
      ).redisCache.get('pat-remote_k');
      expect(directRedis).toBeUndefined();
    });

    test('no ttl flags: no-op (neither layer touched)', async () => {
      await johnyCacheService.set(bothTtl('pat-noop', 'k'), 'survives');

      await johnyCacheService.deleteByPattern(
        new CacheSetting({ prefix: 'pat-noop', suffix: '*' }),
      );

      expect(await johnyCacheService.get(bothTtl('pat-noop', 'k'))).toEqual(
        'survives',
      );
    });

    test('handleDeleteRemoteKeysEvent applies pattern locally', async () => {
      await johnyCacheService.set(bothTtl('pat-sub', 'a'), '1');
      await johnyCacheService.set(bothTtl('pat-sub', 'b'), '2');
      await johnyCacheService.set(bothTtl('pat-other', 'c'), '3');

      // Simulate a pattern-delete event arriving from a different instance.
      await johnyCacheService.handleDeleteRemoteKeysEvent({
        keys: ['pat-sub_*'],
        instanceId: 'other-instance',
      });

      // Directly probe local memory to confirm pattern eviction (bypassing redis).
      const mem = (johnyCacheService as any).memoryCache;
      expect(mem.getCacheValue('pat-sub_a')).toBeUndefined();
      expect(mem.getCacheValue('pat-sub_b')).toBeUndefined();
      expect(mem.getCacheValue('pat-other_c')).toEqual('3');
    });

    test('handleDeleteRemoteKeysEvent ignores events from self', async () => {
      await johnyCacheService.set(bothTtl('pat-self', 'a'), 'keep');

      await johnyCacheService.handleDeleteRemoteKeysEvent({
        keys: ['pat-self_*'],
        instanceId: (johnyCacheService as any).instanceId,
      });

      const mem = (johnyCacheService as any).memoryCache;
      expect(mem.getCacheValue('pat-self_a')).toEqual('keep');
    });
  });
});
