export class CacheSetting {
    key: string;
    localTtl?: number;
    remoteTtl?: number;
    // pattern?: string;
  
    // refresh or not the TTL for .set() true by default
    refreshTtl?: boolean = true;
  
    constructor(init?: Partial<CacheSetting>) {
      Object.assign(this, init);
    }
}

export interface LockerOptions {
    retryCount?: number;
    retryDelay?: number;
    retryJitter?: number;
  }
  
export interface LockCacheSettings extends CacheSetting {
  lockOptions?: LockerOptions;
}
