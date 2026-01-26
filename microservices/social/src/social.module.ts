import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { MongooseModule } from "@nestjs/mongoose";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { TerminusModule } from "@nestjs/terminus";
import { redisStore } from "cache-manager-redis-yet";
import { SocialService } from "./social.service";
import {
  Follow,
  FollowSchema,
  UserProfileReplica,
  UserProfileReplicaSchema,
} from "@app/shared";

@Module({
  imports: [
    TerminusModule,
    // Подключение к MongoDB
    MongooseModule.forRoot(
      process.env.MONGODB_URL ||
        "mongodb://root:secret@localhost:27017/social_db?authSource=admin",
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
      { name: Follow.name, schema: FollowSchema },
      {
        name: UserProfileReplica.name,
        schema: UserProfileReplicaSchema,
      },
    ]),
    // Настройка Redis кэширования
    CacheModule.registerAsync({
      isGlobal: false,
      useFactory: async () => {
        const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
        const url = new URL(redisUrl);
        const store = await redisStore({
          socket: {
            host: url.hostname,
            port: parseInt(url.port || "6379", 10),
          },
        });
        return {
          store,
          ttl: 10 * 60 * 1000, // 10 минут
        };
      },
    }),
    // Клиент для User Service
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
        name: "MEDIA_SERVICE",
        useFactory: () => {
          const rabbitmqUrl =
            process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
          const queue = process.env.MEDIA_QUEUE || "media_queue";

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
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
