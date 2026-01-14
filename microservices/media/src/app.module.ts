import { Module } from "@nestjs/common";
import { MediaModule } from "./media.module";
import { MediaController } from "./media.controller";

@Module({
  imports: [MediaModule],
  controllers: [MediaController],
})
export class AppModule {}
