import { RedisPubSub } from 'graphql-redis-subscriptions';
import { RedisConfig } from './redis-config';
import { RedisClient } from 'ioredis/built/connectors/SentinelConnector/types';
import Redis from 'ioredis';

export class RedisPubSubService extends RedisPubSub {
  constructor(options: { publisher: Redis; subscriber: Redis }) {
    super({
      publisher: options.publisher,
      subscriber: options.subscriber,
    });
  }
}

// export class RedisPubSubService extends RedisPubSub {
//   constructor(redisConfig: RedisConfig | string) {
//     if (typeof redisConfig === 'string') {
//       super({ connection: redisConfig });
//     } else {
//       super({
//         connection: {
//           host: redisConfig.host,
//           port: redisConfig.port,
//           username: redisConfig.username,
//           password: redisConfig.password,
//           ...(redisConfig.tls && { tls: redisConfig.tls }),
//         },
//       });
//     }
//   }
// }
