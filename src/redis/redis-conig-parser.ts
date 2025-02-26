export interface RedisConfig {
    host: string;
    port: number;
    username?: string;
    password?: string;
    db?: number;
  }
  
export function parseRedisConnectionString(redisUrl: string): RedisConfig {
    // Ensure the URL has a protocol
    if (!redisUrl.startsWith('redis://')) {
      redisUrl = `redis://${redisUrl}`;
    }
    const url = new URL(redisUrl);
    const host = url.hostname;
    const port = Number(url.port) || 6379;
    const username = url.username || undefined;
    const password = url.password || undefined;
    // The pathname may contain the DB index, for example: "/0"
    const db = url.pathname ? parseInt(url.pathname.slice(1), 10) : 0;
    return { host, port, username, password, db };
}
