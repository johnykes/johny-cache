# johny-cache

> **Caching can be hard. Let’s keep it simple!**

johny-cache is a lightweight, framework‐agnostic TypeScript library for caching and distributed locking. It combines **local in‐memory** caching and **Redis‐based remote** caching in one **easy‐to‐use service**. Simply provide a Redis connection string and let johny-cache handle the rest—no need to manually juggle Redis clients, memory caches, or distributed locks.

FYI - Some of the code is inspired from https://github.com/multiversx/mx-sdk-nestjs.

---

## Motivation

Caching can be deceptively complex. <br/>
You might use both a Redis cache and an in-memory (local) cache, but as soon as you scale out horizontally - running multiple app instances - your data can become inconsistent across each instance’s local cache and the shared Redis cache. <br/> Keeping them all synchronized can feel like a never-ending headache.

johny-cache aims to solve that headache. By providing a simple, unified API, it handles local caching, remote caching, and cross-instance synchronization for you. All you need to do is define your desired cache settings, and the library takes care of the rest.

## Features

- **Simple Initialization**: Just pass in your Redis URL.
- **Local + Remote Caching**: Seamlessly store data in both an in‐memory cache (fast lookups) and Redis (shared/distributed cache).
- **TTL & Auto‐Refresh**: Specify TTL (time‐to‐live) for each cache entry and optionally auto‐refresh remote TTL.
- **Distributed Locking**: Built‐in support for Redlock to handle concurrency.
- **Pub/Sub Invalidation**: Refresh or invalidate cache across multiple instances using Redis Pub/Sub.
- **NestJS Friendly**: Works great in NestJS or any Node.js environment.

---

## Installation

```bash
npm install johny-cache
```

# Quick Start

## Instalation

```bash
npm install johny-cache
```

## Import and Initialize

```TS
import { JohnyCacheService } from 'johny-cache';

const redisUrl = 'redis://localhost:6379';
const cacheService = new JohnyCacheService(redisUrl);
```

## Define Your Cache Settings

```TS
import { JohnyCacheService, CacheSetting, Constants } from 'johny-cache';

const cacheSettings: CacheSetting = {
  prefix: 'user',  // unique prefix
  suffix: '123',   // unique suffix
  localTtl: 10,    // seconds (in local cache/memory)
  remoteTtl: 300,  // seconds (remote/Redis)
};
```

## Set and Get Data

```TS
// Set a value in cache
await cacheService.set(cacheSettings, { name: 'Alice', age: 30 });

// Retrieve the value from cache
const user = await cacheService.get(cacheSettings);
console.log(user); // { name: 'Alice', age: 30 }
```

## Lazy Loading with getOrSetCache

```TS
const userData = await cacheService.getOrSetCache(cacheSettings, async () => {
  // Fallback: fetch from a database if not in cache
  return { id: 123, name: 'DB Alice' };
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
import { LockCacheSettings } from 'johny-cache';

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
