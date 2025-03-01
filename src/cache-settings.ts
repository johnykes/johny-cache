export class CacheSetting {
  prefix: string;
  suffix: string;

  getKey(): string {
    return `${this.prefix}_${this.suffix}`;
  }

  // ttl
  localTtl?: number;
  remoteTtl?: number;

  // refresh or not the TTL for .set() true by default
  refreshTtl?: boolean = true;

  constructor(init?: Partial<CacheSetting>) {
    Object.assign(this, init);
  }
}

export class LockerOptions {
  retryCount?: number;
  retryDelay?: number;
  retryJitter?: number;

  constructor(init?: Partial<LockerOptions>) {
    Object.assign(this, init);
  }
}

export class LockCacheSettings extends CacheSetting {
  lockOptions?: LockerOptions;

  // for aquire lock TTl works differently for some reason
  static getTtl(lockCacheSettings: LockCacheSettings): number {
    return lockCacheSettings.remoteTtl ? lockCacheSettings.remoteTtl * 1000 : 0;
  }

  constructor(init?: Partial<LockCacheSettings>) {
    super(init);
    Object.assign(this, init);
  }
}
