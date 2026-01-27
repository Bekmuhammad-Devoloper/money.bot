import { Injectable, OnModuleInit, OnModuleDestroy, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';

export interface RedisOptions {
  host: string;
  port: number;
  password?: string;
}

export interface UserState {
  step: string;
  data: Record<string, unknown>;
  lastUpdated: number;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(
    @Inject('REDIS_OPTIONS') private readonly options: RedisOptions,
  ) {
    this.client = new Redis({
      host: this.options.host,
      port: this.options.port,
      password: this.options.password || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
  }

  async onModuleInit() {
    this.client.on('connect', () => {
      this.logger.log('Connected to Redis');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  // ============ User State Management ============

  private getUserStateKey(telegramId: number): string {
    return `user:state:${telegramId}`;
  }

  async getUserState(telegramId: number): Promise<UserState | null> {
    const data = await this.client.get(this.getUserStateKey(telegramId));
    if (!data) return null;
    return JSON.parse(data);
  }

  async setUserState(
    telegramId: number,
    step: string,
    data: Record<string, unknown> = {},
    ttl: number = 3600, // 1 hour default
  ): Promise<void> {
    const state: UserState = {
      step,
      data,
      lastUpdated: Date.now(),
    };
    await this.client.setex(
      this.getUserStateKey(telegramId),
      ttl,
      JSON.stringify(state),
    );
  }

  async updateUserStateData(
    telegramId: number,
    data: Record<string, unknown>,
  ): Promise<void> {
    const currentState = await this.getUserState(telegramId);
    if (currentState) {
      await this.setUserState(telegramId, currentState.step, {
        ...currentState.data,
        ...data,
      });
    }
  }

  async clearUserState(telegramId: number): Promise<void> {
    await this.client.del(this.getUserStateKey(telegramId));
  }

  // ============ Rate Limiting ============

  private getRateLimitKey(telegramId: number, action: string): string {
    return `ratelimit:${action}:${telegramId}`;
  }

  async checkRateLimit(
    telegramId: number,
    action: string,
    maxRequests: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const key = this.getRateLimitKey(telegramId, action);
    const current = await this.client.incr(key);
    
    if (current === 1) {
      await this.client.expire(key, windowSeconds);
    }

    const ttl = await this.client.ttl(key);
    const remaining = Math.max(0, maxRequests - current);
    
    return {
      allowed: current <= maxRequests,
      remaining,
      resetIn: ttl > 0 ? ttl : windowSeconds,
    };
  }

  // ============ Cache Operations ============

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // ============ Admin Session Management ============

  private getAdminSessionKey(adminId: number): string {
    return `admin:session:${adminId}`;
  }

  async setAdminState(
    adminId: number,
    state: string,
    data: Record<string, unknown> = {},
  ): Promise<void> {
    await this.client.setex(
      this.getAdminSessionKey(adminId),
      7200, // 2 hours
      JSON.stringify({ state, data, lastUpdated: Date.now() }),
    );
  }

  async getAdminState(adminId: number): Promise<{ state: string; data: Record<string, unknown> } | null> {
    const data = await this.client.get(this.getAdminSessionKey(adminId));
    if (!data) return null;
    return JSON.parse(data);
  }

  async clearAdminState(adminId: number): Promise<void> {
    await this.client.del(this.getAdminSessionKey(adminId));
  }

  // ============ Broadcast Progress Tracking ============

  private getBroadcastProgressKey(broadcastId: string): string {
    return `broadcast:progress:${broadcastId}`;
  }

  async setBroadcastProgress(
    broadcastId: string,
    sent: number,
    failed: number,
    total: number,
  ): Promise<void> {
    await this.client.setex(
      this.getBroadcastProgressKey(broadcastId),
      86400, // 24 hours
      JSON.stringify({ sent, failed, total }),
    );
  }

  async getBroadcastProgress(broadcastId: string): Promise<{ sent: number; failed: number; total: number } | null> {
    const data = await this.client.get(this.getBroadcastProgressKey(broadcastId));
    if (!data) return null;
    return JSON.parse(data);
  }

  // ============ Locking Mechanism ============

  async acquireLock(key: string, ttl: number = 30): Promise<boolean> {
    const result = await this.client.set(`lock:${key}`, '1', 'EX', ttl, 'NX');
    return result === 'OK';
  }

  async releaseLock(key: string): Promise<void> {
    await this.client.del(`lock:${key}`);
  }
}
