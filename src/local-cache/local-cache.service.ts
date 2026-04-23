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

  deleteCacheKeysByPattern(pattern: string) {
    const regex = LocalCacheService.globToRegex(pattern);
    const keys = Object.keys(LocalCacheService.dictionary);
    for (let i = 0, len = keys.length; i < len; i++) {
      if (regex.test(keys[i])) {
        delete LocalCacheService.dictionary[keys[i]];
      }
    }
  }

  private static globToRegex(pattern: string): RegExp {
    let out = '';
    for (let i = 0, len = pattern.length; i < len; i++) {
      const ch = pattern[i];
      if (ch === '*') {
        out += '.*';
      } else if (ch === '?') {
        out += '.';
      } else {
        // escape regex metacharacters
        out += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
      }
    }
    return new RegExp('^' + out + '$');
  }

  refreshCacheLocalTtl(key: string, ttl: number) {
    const cacheValue = LocalCacheService.dictionary[key];
    if (!cacheValue) {
      return;
    }
    cacheValue.expires = new Date().getTime() + (ttl * 1000);
  }
}
