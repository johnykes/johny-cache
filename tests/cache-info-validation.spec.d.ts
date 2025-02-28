import { CacheSetting } from '../src/cache-settings';
export declare class TestUserCacheSettings {
    static UserDataCacheSettings(userIdOrEmail: string, provider?: string): CacheSetting;
    static UserProfileDataCacheSettings(userId: string): CacheSetting;
}
export declare class TestGameCacheSettings {
    static GameDataCacheSettings(gameId: string): CacheSetting;
}
export declare class TestDuplicateGameCacheSettings {
    static GameDataCacheSettings(gameId: string): CacheSetting;
    static GameDataCacheSettingsDuplicate(gameId: string): CacheSetting;
}
//# sourceMappingURL=cache-info-validation.spec.d.ts.map