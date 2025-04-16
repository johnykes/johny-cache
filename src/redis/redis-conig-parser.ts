export interface RedisConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: any;

  family?: number | string;
}

export function parseRedisConnectionString(redisUrl: string): RedisConfig {
  // // If no protocol, assume TLS (rediss://) based on port 25061
  // if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
  //   if (redisUrl.includes(':25061')) {
  //     redisUrl = `rediss://${redisUrl}`;
  //   } else {
  //     redisUrl = `redis://${redisUrl}`;
  //   }
  // }

  let url: URL;

  try {
    url = new URL(redisUrl);
  } catch (err) {
    throw new Error(`Invalid Redis URL`);
  }

  const host = url.hostname;
  const port = Number(url.port) || 6379;
  const username = url.username || undefined;
  const password = url.password || undefined;
  const db = url.pathname ? parseInt(url.pathname.slice(1), 10) : 0;

  const family = url.searchParams.get('family');

  const isTls = url.protocol === 'rediss:';

  // const tls = isTls
  //   ? {
  //       rejectUnauthorized: false,
  //       servername: host,
  //       // host: host,
  //       // port: port,
  //       // checkServerIdentity: () => undefined,
  //     }
  //   : {};
  const tls = isTls ? true : false;

  return { host, port, username, password, db, tls, ...(family && { family }) };
}
