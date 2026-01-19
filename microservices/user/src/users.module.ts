import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { MongooseModule } from "@nestjs/mongoose";
import { redisStore } from "cache-manager-redis-yet";
import { UsersService } from "./users.service";
import { UserProfile, UserProfileSchema } from "@app/shared";

@Module({
  imports: [
    // Подключение к MongoDB с таймаутами
    MongooseModule.forRoot(
      process.env.MONGODB_URL ||
        "mongodb://root:secret@localhost:27017/user_db?authSource=admin",
      {
        serverSelectionTimeoutMS: 30000, // 30 секунд на подключение
        socketTimeoutMS: 30000, // 30 секунд на операции
        connectTimeoutMS: 30000, // 30 секунд на установку соединения
        maxPoolSize: 10, // Максимальное количество соединений в пуле
        minPoolSize: 2, // Минимальное количество соединений в пуле
        retryWrites: true, // Повторять запись при ошибках
        retryReads: true, // Повторять чтение при ошибках
      },
    ),
    MongooseModule.forFeature([
      { name: UserProfile.name, schema: UserProfileSchema },
    ]),
    // Настройка Redis кэширования
    CacheModule.registerAsync({
      isGlobal: false,
      useFactory: async () => {
        const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
        // Парсим URL Redis
        const url = new URL(redisUrl);
        const store = await redisStore({
          socket: {
            host: url.hostname,
            port: parseInt(url.port || "6379", 10),
          },
        });
        return {
          store,
          ttl: 5 * 60 * 1000, // 5 минут в миллисекундах
        };
      },
    }),
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
