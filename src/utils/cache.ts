import Redis from 'ioredis';
import logger from './logger';

class CacheManager {
  private redis: Redis | null = null;
  private enabled: boolean = true;

  constructor() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        retryStrategy: (times) => {
          if (times > 3) {
            logger.warn('Redis unavailable after 3 attempts. Running without cache.');
            return null;
          }
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 1
      });

      this.redis.on('error', (err) => {
        if (!err.message.includes('ECONNREFUSED')) {
          logger.error('Redis connection error:', err);
        }
        this.enabled = false;
      });

      this.redis.on('connect', () => {
        logger.info('Redis connected successfully');
        this.enabled = true;
      });
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      this.enabled = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.redis) {
      return null;
    }

    try {
      const data = await this.redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.enabled || !this.redis) {
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      const cacheTtl = ttl || parseInt(process.env.CACHE_TTL || '60');
      await this.redis.set(key, serialized, 'EX', cacheTtl);
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.enabled || !this.redis) {
      return;
    }

    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async clear(): Promise<void> {
    if (!this.enabled || !this.redis) {
      return;
    }

    try {
      await this.redis.flushdb();
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

export default new CacheManager();
