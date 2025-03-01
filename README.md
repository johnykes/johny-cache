# johny-cache

> **Caching can be hard. Let’s keep it simple!**

johny-cache is a lightweight, framework‐agnostic TypeScript library for distributed caching & locking with 0 headaches. It combines **local in‐memory** caching and **Redis‐based remote** caching in one **easy‐to‐use service**. Simply provide a Redis connection string and let johny-cache handle the rest - no need to manually juggle Redis clients, memory caches, or distributed locks.

FYI - Some of the code is inspired from https://github.com/multiversx/mx-sdk-nestjs.

---

## Motivation

Caching can be deceptively complex. <br/>
You might use both a Redis cache and an in-memory (local) cache, but as soon as you scale out horizontally - running multiple app instances - your data can become inconsistent across each instance’s local cache and the shared Redis cache. <br/> Keeping them all synchronized can feel like a never-ending headache.

johny-cache aims to solve that by providing a simple, unified API, it handles local caching, remote caching, and cross-instance synchronization for you. All you need to do is define your desired cache settings for each scope, and the library takes care of the rest.

## Features

- **Simple Initialization**: Just pass in your Redis URL.
- **Local + Remote Caching**: Seamlessly store data in both an in‐memory cache (fast lookups) and Redis (shared/distributed cache), or just in one of them, using simple CacheSettings.
- **TTL & Auto‐Refresh**: Specify TTL (time‐to‐live) for each cache entry and optionally auto‐refresh remote TTL.
- **Distributed Locking**: Built‐in support for Redlock to handle concurrency.
- **Pub/Sub Invalidation**: Automatically refresh or invalidate cache across multiple instances using Redis Pub/Sub.
- **NestJS Friendly**: Works great in NestJS or any Node.js environment.

---

## How Synchronization Works

Based on the provided CacheSettings, the library will use in-memory local cachin AND/OR Redis caching. Setting new data will also make sure that the remote data across other connected instances will get the new data (if localTtl exists in cache settings).

# Quick Start

## Instalation

```bash
npm install johnycash
```

## Import and Initialize

```TS
import { JohnyCacheService } from 'johnycash';

const redisUrl = 'redis://localhost:6379';
const cacheService = new JohnyCacheService(redisUrl);
```

## Define Your Cache Settings

```TS
import { JohnyCacheService, CacheSetting, Constants } from 'johnycash';

const cacheSettings = new CacheSetting({
  prefix: "user",                         // unique prefix / scope / namespace
  suffix: `${userIdOrEmail}`,             // unique suffix
  localTtl: Constants.oneHour(),          // seconds (in local cache/memory)
  remoteTtl: 10 * Constants.oneMinute(),  // seconds (remote/Redis)
});
```

## Set and Get Data

```TS
const username = 'alice';
const userData = await this.db.getUserByUsername(username);

const cacheSettings = new CacheSetting({
  prefix: "user",                         // unique prefix / scope / namespace
  suffix: `${userData.id}`,               // unique suffix
  localTtl: Constants.oneHour(),          // seconds (in local cache/memory)
  remoteTtl: 10 * Constants.oneMinute(),  // seconds (remote/Redis)
});

await cacheService.set(cacheSettings, userData);

// Retrieve the value from cache
const cachedUserData = await cacheService.get(cacheSettings);
console.log(cachedUserData); // { name: 'Alice', age: 30, ... }
```

## Lazy Loading with getOrSetCache

```TS
const userData = await cacheService.getOrSetCache(cacheSettings, async () => {
  // Fallback: fetch from a database if not in cache
  return await this.db.getUserByUsername(username);
});

console.log(userData); // Value from cache or from the fallback function
```

## Deleting Cache Entries

```TS
// Delete a specific cache key
await cacheService.delete(cacheSettings);
```

## Distributed Locking

```TS
import { LockCacheSettings } from 'johnycash';

const lockSettings: LockCacheSettings = {
  prefix: 'delete-inactive-users-cronjob-locker',
  remoteTtl: 5 * Constants.OneSecond()
  // optional locker settings
  // lockOptions: {
  //   retryCount: 3,
  //   retryDelay: 50,
  //   retryJitter: 10,
  // },
};

const lock = await cacheService.acquireLock(lockSettings);
if (lock) {
  try {
    // Execute critical section code here
  } finally {
    await cacheService.releaseLock(lock);
  }
}
```

## Nestjs Module Sample

```TS
@Global()
@Module({
  imports: [CommonModule],
  providers: [
    {
      provide: JohnyCacheService,
      useFactory: (apiConfigService: ApiConfigService) =>
        new JohnyCacheService(apiConfigService.getRedisUrl()),
      inject: [ApiConfigService],
    },
    CacheInfoValidationService,
  ],
  exports: [JohnyCacheService],
})
export class CacheModule {}
```

## Unique cache settings prefix validation + simple way to declare all the keys in a single file (e.g. cache.settings.ts)

```TS

export class CacheInfo {
  static UserDataCacheSettings(
    userIdOrEmail: string,
    provider?: UserAuthProviders,
  ): CacheSetting {
    return new CacheSetting({
      prefix: 'ud',
      suffix: `${userIdOrEmail}` + (provider ? `_${provider}` : ''),
      remoteTtl: Constants.oneHour(),
      localTtl: 10 * Constants.oneMinute(),
    });
  }

  static UserProfileDataCacheSettings(userId: string): CacheSetting {
    return new CacheSetting({
      prefix: `upd_${userId}`,
      remoteTtl: Constants.oneHour(),
      localTtl: 10 * Constants.oneMinute(),
    });
  }
}

export function validateUniqueKeys() {
  const staticMethodNames = Object.getOwnPropertyNames(CacheInfo).filter(
    (prop) => typeof CacheInfo[prop] === 'function' && prop !== 'constructor',
  );
  const staticMethodsArray = staticMethodNames.map(
    (methodName) => CacheInfo[methodName],
  );
  new CacheInfoValidationService(staticMethodsArray);
}

// Then you can use a service that just starts with the app and validates all the unique prefix keys, so you don't have  conflicts
@Injectable()
export class CacheInfoValidationService {
  constructor() {
    validateUniqueKeys();
  }
}
```
