import { Module } from "@nestjs/common";
import { SocialModule } from "./social.module";
import { SocialController } from "./social.controller";

@Module({
  imports: [SocialModule],
  controllers: [SocialController],
})
export class AppModule {}
