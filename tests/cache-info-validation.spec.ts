import { Constants } from '../src/constants';
import { CacheInfoValidationService } from '../src/cache-info-validation.service';
import { CacheSetting } from '../src/cache-settings';

// Define valid cache settings
export class TestUserCacheSettings {
  static UserDataCacheSettings(
    userIdOrEmail: string,
    provider?: string,
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
      prefix: 'upd',
      suffix: `${userId}`,
      remoteTtl: Constants.oneHour(),
      localTtl: 10 * Constants.oneMinute(),
    });
  }
}

export class TestGameCacheSettings {
  static GameDataCacheSettings(gameId: string): CacheSetting {
    return new CacheSetting({
      prefix: 'game',
      suffix: `${gameId}`,
      remoteTtl: Constants.oneDay(),
      localTtl: 30 * Constants.oneMinute(),
    });
  }
}

// Define invalid cache settings (duplicate prefix)
export class TestDuplicateGameCacheSettings {
  static GameDataCacheSettings(gameId: string): CacheSetting {
    return new CacheSetting({
      prefix: 'game',
      suffix: `${gameId}`,
      remoteTtl: Constants.oneDay(),
      localTtl: 30 * Constants.oneMinute(),
    });
  }

  static GameDataCacheSettingsDuplicate(gameId: string): CacheSetting {
    return new CacheSetting({
      prefix: 'game', // Duplicate prefix!
      suffix: `${gameId}`,
      remoteTtl: Constants.oneDay(),
      localTtl: 30 * Constants.oneMinute(),
    });
  }
}

describe('CacheInfoValidationService', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeAll(() => {
    // Suppress console warnings for required parameters
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterAll(() => {
    consoleWarnSpy.mockRestore();
  });

  test('should not throw error for unique prefixes', () => {
    expect(() => {
      new CacheInfoValidationService(
        TestUserCacheSettings,
        TestGameCacheSettings,
      );
    }).not.toThrow();
  });

  test('should throw error for duplicate prefixes', () => {
    expect(() => {
      new CacheInfoValidationService(TestDuplicateGameCacheSettings);
    }).toThrowError(/Duplicate prefix found: game/);
  });
});
