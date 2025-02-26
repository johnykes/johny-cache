import { Injectable } from "@nestjs/common";
import { LocalCacheValue } from "./local.cache.value";

@Injectable()
export class LocalCacheService {
  private static readonly dictionary: { [key: string]: LocalCacheValue } = {};

  setCacheValue<T>(key: string, value: T, ttl: number): T {
    const expires = new Date().getTime() + (ttl * 1000);

    LocalCacheService.dictionary[key] = {
      value,
      expires,
    };

    return value;
  }

  getCacheValue<T>(key: string): T | undefined {
    const cacheValue = LocalCacheService.dictionary[key];
    if (!cacheValue) {
      return undefined;
    }

    const now = new Date().getTime();
    if (cacheValue.expires < now) {
      delete LocalCacheService.dictionary[key];
      return undefined;
    }

    return cacheValue.value;
  }

  deleteCacheKey(key: string) {
    delete LocalCacheService.dictionary[key];
  }

  refreshCacheLocalTtl(key: string, ttl: number) {
    const cacheValue = LocalCacheService.dictionary[key];
    if (!cacheValue) {
      return;
    }
    cacheValue.expires = new Date().getTime() + (ttl * 1000);
  }
}
