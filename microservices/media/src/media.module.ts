import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { MongooseModule } from "@nestjs/mongoose";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { TerminusModule } from "@nestjs/terminus";
import { redisStore } from "cache-manager-redis-yet";
import { MediaService } from "./media.service";
import { StorageService } from "./storage.service";
import { MediaFile, MediaFileSchema } from "@app/shared";

@Module({
  imports: [
    TerminusModule,
    // Подключение к MongoDB
    MongooseModule.forRoot(
      process.env.MONGODB_URL ||
        "mongodb://root:secret@localhost:27017/media_db?authSource=admin",
      {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 30000,
        connectTimeoutMS: 30000,
        maxPoolSize: 10,
        minPoolSize: 2,
        retryWrites: true,
        retryReads: true,
      },
    ),
    MongooseModule.forFeature([
      { name: MediaFile.name, schema: MediaFileSchema },
    ]),
    // Настройка Redis кэширования
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
        const url = new URL(redisUrl);

        // Функция для создания Redis store с повторными попытками
        const createRedisStore = async (retries = 3): Promise<any> => {
          try {
            const store = await redisStore({
              socket: {
                host: url.hostname,
                port: parseInt(url.port || "6379", 10),
                connectTimeout: 30000, // 30 секунд на подключение
                reconnectStrategy: (retries) => {
                  if (retries > 10) {
                    console.error("Redis: Max reconnection attempts reached");
                    return new Error(
                      "Redis: Max reconnection attempts reached",
                    );
                  }
                  const delay = Math.min(retries * 100, 3000);
                  return delay;
                },
              },
            });
            return store;
          } catch (error) {
            if (retries > 0) {
              console.warn(
                `Redis connection failed, retrying... (${retries} attempts left)`,
              );
              await new Promise((resolve) => setTimeout(resolve, 2000));
              return createRedisStore(retries - 1);
            }
            console.error("Redis: Failed to connect after retries:", error);
            throw error;
          }
        };

        const store = await createRedisStore();
        return {
          store,
          ttl: 10 * 60 * 1000, // 10 минут
        };
      },
    }),
    // Клиенты для User Service и Social Service
    ClientsModule.registerAsync([
      {
        name: "USER_SERVICE",
        useFactory: () => {
          const rabbitmqUrl =
            process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
          const queue = process.env.USER_QUEUE || "user_queue";

          return {
            transport: Transport.RMQ,
            options: {
              urls: [rabbitmqUrl],
              queue,
              queueOptions: {
                durable: true,
              },
            },
          };
        },
      },
      {
        name: "SOCIAL_SERVICE",
        useFactory: () => {
          const rabbitmqUrl =
            process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
          const queue = process.env.SOCIAL_QUEUE || "social_queue";

          return {
            transport: Transport.RMQ,
            options: {
              urls: [rabbitmqUrl],
              queue,
              queueOptions: {
                durable: true,
              },
            },
          };
        },
      },
    ]),
  ],
  providers: [MediaService, StorageService],
  exports: [MediaService],
})
export class MediaModule {}
