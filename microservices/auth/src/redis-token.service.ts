import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import * as crypto from "crypto";

@Injectable()
export class RedisTokenService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    this.redisClient = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });
  }

  async onModuleInit() {
    try {
      await this.redisClient.ping();
      console.log("Redis connected successfully");
    } catch (error) {
      console.error("Failed to connect to Redis:", error);
    }
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
  }

  async saveRefreshToken(
    userId: string,
    refreshToken: string,
    ttl: number = 7 * 24 * 60 * 60, // 7 дней
  ): Promise<void> {
    const key = this.getTokenKey(userId, refreshToken);
    await this.redisClient.setex(key, ttl, "1");
  }

  async isRefreshTokenValid(
    userId: string,
    refreshToken: string,
  ): Promise<boolean> {
    const key = this.getTokenKey(userId, refreshToken);
    const result = await this.redisClient.exists(key);
    return result === 1;
  }

  async revokeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const key = this.getTokenKey(userId, refreshToken);
    await this.redisClient.del(key);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    const pattern = `refresh_token:${userId}:*`;
    const keys = await this.redisClient.keys(pattern);
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
  }

  private getTokenKey(userId: string, refreshToken: string): string {
    // Используем хэш токена для безопасности (не храним полный токен в ключе)
    const tokenHash = this.getTokenHash(refreshToken);
    return `refresh_token:${userId}:${tokenHash}`;
  }

  getTokenHash(refreshToken: string): string {
    return crypto.createHash("sha256").update(refreshToken).digest("hex");
  }

  async isTokenHashValid(userId: string, tokenHash: string): Promise<boolean> {
    const key = `refresh_token:${userId}:${tokenHash}`;
    const result = await this.redisClient.exists(key);
    return result === 1;
  }

  async revokeTokenByHash(userId: string, tokenHash: string): Promise<void> {
    const key = `refresh_token:${userId}:${tokenHash}`;
    await this.redisClient.del(key);
  }
}
