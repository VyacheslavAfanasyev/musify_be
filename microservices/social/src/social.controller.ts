import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { SocialService } from "./social.service";
import type { IFollowDto } from "@app/shared";

@Controller()
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @MessagePattern({ cmd: "getHello" })
  getHello(): string {
    return "Hello World from SOCIAL-SERVICE!";
  }

  @MessagePattern({ cmd: "followUser" })
  async followUser(@Payload() payload: IFollowDto) {
    return await this.socialService.followUser(
      payload.followerId,
      payload.followingId,
    );
  }

  @MessagePattern({ cmd: "unfollowUser" })
  async unfollowUser(@Payload() payload: IFollowDto) {
    return await this.socialService.unfollowUser(
      payload.followerId,
      payload.followingId,
    );
  }
}
