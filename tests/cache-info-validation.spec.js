"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestDuplicateGameCacheSettings = exports.TestGameCacheSettings = exports.TestUserCacheSettings = void 0;
const constants_1 = require("../src/constants");
const cache_info_validation_service_1 = require("../src/cache-info-validation.service");
const cache_settings_1 = require("../src/cache-settings");
class TestUserCacheSettings {
    static UserDataCacheSettings(userIdOrEmail, provider) {
        return new cache_settings_1.CacheSetting({
            prefix: 'ud',
            suffix: `${userIdOrEmail}` + (provider ? `_${provider}` : ''),
            remoteTtl: constants_1.Constants.oneHour(),
            localTtl: 10 * constants_1.Constants.oneMinute(),
        });
    }
    static UserProfileDataCacheSettings(userId) {
        return new cache_settings_1.CacheSetting({
            prefix: 'upd',
            suffix: `${userId}`,
            remoteTtl: constants_1.Constants.oneHour(),
            localTtl: 10 * constants_1.Constants.oneMinute(),
        });
    }
}
exports.TestUserCacheSettings = TestUserCacheSettings;
class TestGameCacheSettings {
    static GameDataCacheSettings(gameId) {
        return new cache_settings_1.CacheSetting({
            prefix: 'game',
            suffix: `${gameId}`,
            remoteTtl: constants_1.Constants.oneDay(),
            localTtl: 30 * constants_1.Constants.oneMinute(),
        });
    }
}
exports.TestGameCacheSettings = TestGameCacheSettings;
class TestDuplicateGameCacheSettings {
    static GameDataCacheSettings(gameId) {
        return new cache_settings_1.CacheSetting({
            prefix: 'game',
            suffix: `${gameId}`,
            remoteTtl: constants_1.Constants.oneDay(),
            localTtl: 30 * constants_1.Constants.oneMinute(),
        });
    }
    static GameDataCacheSettingsDuplicate(gameId) {
        return new cache_settings_1.CacheSetting({
            prefix: 'game',
            suffix: `${gameId}`,
            remoteTtl: constants_1.Constants.oneDay(),
            localTtl: 30 * constants_1.Constants.oneMinute(),
        });
    }
}
exports.TestDuplicateGameCacheSettings = TestDuplicateGameCacheSettings;
describe('CacheInfoValidationService', () => {
    let consoleWarnSpy;
    beforeAll(() => {
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });
    afterAll(() => {
        consoleWarnSpy.mockRestore();
    });
    test('should not throw error for unique prefixes', () => {
        expect(() => {
            new cache_info_validation_service_1.CacheInfoValidationService(TestUserCacheSettings, TestGameCacheSettings);
        }).not.toThrow();
    });
    test('should throw error for duplicate prefixes', () => {
        expect(() => {
            new cache_info_validation_service_1.CacheInfoValidationService(TestDuplicateGameCacheSettings);
        }).toThrowError(/Duplicate prefix found: game/);
    });
});
//# sourceMappingURL=cache-info-validation.spec.js.map