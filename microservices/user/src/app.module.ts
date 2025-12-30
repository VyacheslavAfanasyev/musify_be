import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "@app/shared";
import { UsersModule } from "./users.module";
import { UserController } from "./user.controller";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      url:
        process.env.DATABASE_URL ||
        "postgresql://musician:secret@localhost:5432/music_app",
      entities: [User],
      synchronize: process.env.NODE_ENV !== "production", // В продакшене использовать миграции
      logging: process.env.NODE_ENV === "development",
    }),
    UsersModule,
  ],
  controllers: [UserController],
})
export class AppModule {}
