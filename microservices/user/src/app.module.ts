import { Module } from "@nestjs/common";
import { UsersModule } from "./users.module";
import { UserController } from "./user.controller";

@Module({
  imports: [UsersModule],
  controllers: [UserController],
})
export class AppModule {}
