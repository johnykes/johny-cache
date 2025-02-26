import { RedisPubSub } from "graphql-redis-subscriptions";
import { RedisConfig } from "./redis-config";

export class RedisPubSubService extends RedisPubSub {
  constructor(redisConfig: RedisConfig) {
    super({
      connection: {
        host: redisConfig.host,
        port: redisConfig.port,
        username: redisConfig.username,
        password: redisConfig.password,
      },
    });
  }
}
