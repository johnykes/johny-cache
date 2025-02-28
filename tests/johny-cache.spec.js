"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const johny_cache_1 = require("../src/johny-cache");
const cache_settings_1 = require("../src/cache-settings");
const constants_1 = require("../src/constants");
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379/0';
describe('JohnyCacheService', () => {
    let johnyCacheService;
    let johnyCacheService2;
    beforeAll(() => {
        johnyCacheService = new johny_cache_1.JohnyCacheService(redisUrl);
        johnyCacheService2 = new johny_cache_1.JohnyCacheService(redisUrl);
    });
    afterAll(async () => {
        await johnyCacheService.redis.flushall();
        johnyCacheService.redis.disconnect();
        await johnyCacheService2.redis.flushall();
        johnyCacheService2.redis.disconnect();
    });
    test('should set and get a cache value', async () => {
        const cacheSettings = new cache_settings_1.CacheSetting({
            prefix: 'test',
            suffix: 'key',
            localTtl: 5 * constants_1.Constants.oneSecond(),
            remoteTtl: 10 * constants_1.Constants.oneSecond(),
            refreshTtl: true,
        });
        const value = { data: 'hello world' };
        await johnyCacheService.set(cacheSettings, value);
        const retrieved = await johnyCacheService.get(cacheSettings);
        expect(retrieved).toEqual(value);
    });
    test('should delete a cache key', async () => {
        const cacheSettings = new cache_settings_1.CacheSetting({
            prefix: 'test',
            suffix: 'delete',
            localTtl: 5 * constants_1.Constants.oneSecond(),
            remoteTtl: 10 * constants_1.Constants.oneSecond(),
            refreshTtl: false,
        });
        const value = 'delete me';
        await johnyCacheService.set(cacheSettings, value);
        let retrieved = await johnyCacheService.get(cacheSettings);
        expect(retrieved).toEqual(value);
        await johnyCacheService.delete(cacheSettings);
        retrieved = await johnyCacheService.get(cacheSettings);
        expect(retrieved).toBeNull();
    });
    test('should getOrSetCache correctly', async () => {
        const cacheSettings = new cache_settings_1.CacheSetting({
            prefix: 'test',
            suffix: 'getorset',
            localTtl: 5 * constants_1.Constants.oneSecond(),
            remoteTtl: 10 * constants_1.Constants.oneSecond(),
            refreshTtl: false,
        });
        const firstResult = await johnyCacheService.getOrSetCache(cacheSettings, async () => {
            return { id: 1, name: 'John Doe' };
        });
        expect(firstResult).toEqual({ id: 1, name: 'John Doe' });
        const secondResult = await johnyCacheService.getOrSetCache(cacheSettings, async () => {
            return { id: 2, name: 'Jane Doe' };
        });
        expect(secondResult).toEqual({ id: 1, name: 'John Doe' });
    });
    test('should acquire and release a lock', async () => {
        const lockCacheSettings = new cache_settings_1.LockCacheSettings({
            prefix: 'test',
            suffix: 'lock',
            remoteTtl: 2 * constants_1.Constants.oneSecond(),
            lockOptions: new cache_settings_1.LockerOptions({
                retryCount: 3,
                retryDelay: 50,
                retryJitter: 10,
            }),
        });
        const lock = await johnyCacheService.acquireLock(lockCacheSettings);
        expect(lock).toBeDefined();
        if (lock) {
            await expect(johnyCacheService.releaseLock(lock)).resolves.toBeUndefined();
        }
    });
    test('should expire a lock gracefully', async () => {
        const lockCacheSettings = new cache_settings_1.LockCacheSettings({
            prefix: 'test',
            suffix: 'lock-expire',
            remoteTtl: constants_1.Constants.oneSecond(),
            lockOptions: new cache_settings_1.LockerOptions({
                retryCount: 3,
                retryDelay: 50,
                retryJitter: 10,
            }),
        });
        const lock = await johnyCacheService.acquireLock(lockCacheSettings);
        expect(lock).toBeDefined();
        if (lock) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            await expect(johnyCacheService.releaseLock(lock)).resolves.toBeUndefined();
        }
    });
    test('should expire in memory cache', async () => {
        const cacheSettings = new cache_settings_1.CacheSetting({
            prefix: 'test',
            suffix: 'expire-memory',
            localTtl: constants_1.Constants.oneSecond(),
            refreshTtl: false,
        });
        const value = { data: 'hello memory' };
        await johnyCacheService.set(cacheSettings, value);
        let retrieved = await johnyCacheService.get(cacheSettings);
        expect(retrieved).toEqual(value);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        retrieved = await johnyCacheService.get(cacheSettings);
        expect(retrieved).toBeNull();
    });
    test('should expire remote cache', async () => {
        const cacheSettings = new cache_settings_1.CacheSetting({
            prefix: 'test',
            suffix: 'expire-remote',
            remoteTtl: constants_1.Constants.oneSecond(),
            refreshTtl: false,
        });
        const value = { data: 'hello remote' };
        await johnyCacheService.set(cacheSettings, value);
        let retrieved = await johnyCacheService.get(cacheSettings);
        expect(retrieved).toEqual(value);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        retrieved = await johnyCacheService.get(cacheSettings);
        expect(retrieved).toBeNull();
    });
    test('multiple instances should work', async () => {
        const cacheSettings = new cache_settings_1.CacheSetting({
            prefix: 'test',
            suffix: 'multiple-instances',
            remoteTtl: constants_1.Constants.oneSecond(),
        });
        const value = { data: 'hello invalidation' };
        await johnyCacheService.set(cacheSettings, value);
        let retrieved = await johnyCacheService2.get(cacheSettings);
        expect(retrieved).toEqual(value);
    });
    test('cache invalidation should work', async () => {
        const cacheSettings = new cache_settings_1.CacheSetting({
            prefix: 'test',
            suffix: 'invalidation',
            remoteTtl: 10 * constants_1.Constants.oneSecond(),
            localTtl: 5 * constants_1.Constants.oneSecond(),
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
//# sourceMappingURL=johny-cache.spec.js.map