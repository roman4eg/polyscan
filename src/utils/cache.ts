import Redis from 'ioredis';
import logger from './logger';

interface CacheEntry {
  value: any;
  expiresAt: number;
}

class CacheManager {
  private redis: Redis | null = null;
  private enabled: boolean = true;
  private memoryCache: Map<string, CacheEntry> = new Map();

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
    // Try Redis first
    if (this.enabled && this.redis) {
      try {
        const data = await this.redis.get(key);
        if (data) return JSON.parse(data) as T;
      } catch (error) {
        logger.error(`Cache get error for key ${key}:`, error);
      }
    }

    // Fallback to memory cache
    const entry = this.memoryCache.get(key);
    if (entry) {
      if (Date.now() < entry.expiresAt) {
        return entry.value as T;
      } else {
        this.memoryCache.delete(key);
      }
    }

    return null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const cacheTtl = ttl || parseInt(process.env.CACHE_TTL || '60');

    // Try Redis first
    if (this.enabled && this.redis) {
      try {
        const serialized = JSON.stringify(value);
        await this.redis.set(key, serialized, 'EX', cacheTtl);
      } catch (error) {
        logger.error(`Cache set error for key ${key}:`, error);
      }
    }

    // Always save to memory cache as fallback
    const expiresAt = Date.now() + (cacheTtl * 1000);
    this.memoryCache.set(key, { value, expiresAt });

    // Clean up expired entries periodically (simple cleanup)
    if (this.memoryCache.size > 1000) {
      this.cleanupMemoryCache();
    }
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now >= entry.expiresAt) {
        this.memoryCache.delete(key);
      }
    }
  }

  async delete(key: string): Promise<void> {
    if (this.enabled && this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        logger.error(`Cache delete error for key ${key}:`, error);
      }
    }

    this.memoryCache.delete(key);
  }

  async clear(): Promise<void> {
    if (this.enabled && this.redis) {
      try {
        await this.redis.flushdb();
      } catch (error) {
        logger.error('Cache clear error:', error);
      }
    }

    this.memoryCache.clear();
    logger.info('Cache cleared');
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

export default new CacheManager();
