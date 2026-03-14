import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;
  private readonly logger = new Logger(CacheService.name);
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = this.configService.get<number>('REDIS_PORT') || 6379;

    this.redis = new Redis({
      host,
      port,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.warn('Redis unavailable — running without cache. News/social data will be re-fetched each request.');
          return null; // stop retrying
        }
        return Math.min(times * 200, 1000);
      },
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    this.redis.connect().then(() => {
      this.isConnected = true;
      this.logger.log('Redis connected ✓');
    }).catch(() => {
      this.logger.warn('Redis not available — cache disabled.');
    });
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }

  async set(key: string, value: any, ttlSeconds: number = 300) {
    if (!this.isConnected) return;
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (_) {
      // cache miss — silently ignore
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;
    try {
      const data = await this.redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (_) {
      return null;
    }
  }
}
