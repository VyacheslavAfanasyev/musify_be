import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UsersService } from "./users.service";
import { UserProfile, UserProfileSchema } from "@app/shared";

@Module({
  imports: [
    // Подключение к MongoDB с таймаутами
    MongooseModule.forRoot(
      process.env.MONGODB_URL ||
        "mongodb://root:secret@localhost:27017/music_app?authSource=admin",
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
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
