import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { MongooseModule } from "@nestjs/mongoose";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { TerminusModule } from "@nestjs/terminus";
import { redisStore } from "cache-manager-redis-yet";
import { UsersService } from "./users.service";
import { UserProfile, UserProfileSchema } from "@app/shared";

@Module({
  imports: [
    TerminusModule,
    // Подключение к MongoDB с таймаутами
    MongooseModule.forRoot(
      process.env.MONGODB_URL ||
        "mongodb://root:secret@localhost:27017/user_db?authSource=admin",
      {
        serverSelectionTimeoutMS: 30000, // 30 секунд на подключение
        socketTimeoutMS: 30000, // 30 секунд на операции
        connectTimeoutMS: 30000, // 30 секунд на установку соединения
        maxPoolSize: 5, // Максимальное количество соединений в пуле (уменьшено для экономии памяти)
        minPoolSize: 1, // Минимальное количество соединений в пуле
        retryWrites: true, // Повторять запись при ошибках
        retryReads: true, // Повторять чтение при ошибках
      },
    ),
    MongooseModule.forFeature([
      { name: UserProfile.name, schema: UserProfileSchema },
    ]),
    // Настройка Redis кэширования
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
        // Парсим URL Redis
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
          ttl: 5 * 60 * 1000, // 5 минут в миллисекундах
        };
      },
    }),
    // Клиент для Auth Service (для получения email)
    ClientsModule.registerAsync([
      {
        name: "AUTH_SERVICE",
        useFactory: () => {
          const rabbitmqUrl =
            process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
          const queue = process.env.AUTH_QUEUE || "auth_queue";

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
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
