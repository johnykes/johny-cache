import { Injectable } from '@nestjs/common';
import { CacheSetting } from './cache-settings';

@Injectable()
export class CacheInfoValidationService {
  private static keySet = new Set<string>();

  constructor(...cacheClasses: any[]) {
    this.validateUniqueKeys(cacheClasses);
  }

  private validateUniqueKeys(cacheClasses: any[]) {
    const keySet = new Set<string>();

    for (const cacheClass of cacheClasses) {
      // Get all static method names from the class
      const staticMethodNames = Object.getOwnPropertyNames(cacheClass).filter(
        (key) => typeof cacheClass[key] === 'function',
      );

      for (const methodName of staticMethodNames) {
        const func = cacheClass[methodName];
        // Create dummy arguments based on the number of parameters
        const argCount = func.length;
        const dummyArgs = Array(argCount).fill('dummy');

        let cacheSetting: CacheSetting;
        try {
          cacheSetting = func(...dummyArgs);
        } catch (e) {
          // Skip methods that throw during invocation.
          continue;
        }
        if (cacheSetting && cacheSetting.prefix) {
          if (keySet.has(cacheSetting.prefix)) {
            throw new Error(`Duplicate prefix found: ${cacheSetting.prefix}`);
          }
          keySet.add(cacheSetting.prefix);
        }
      }
    }
    CacheInfoValidationService.keySet = keySet;
  }
}
