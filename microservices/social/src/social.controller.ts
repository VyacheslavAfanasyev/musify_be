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

  @MessagePattern({ cmd: "getFollowers" })
  async getFollowers(@Payload() payload: { userId: string }) {
    return await this.socialService.getFollowers(payload.userId);
  }

  @MessagePattern({ cmd: "getFollowing" })
  async getFollowing(@Payload() payload: { userId: string }) {
    return await this.socialService.getFollowing(payload.userId);
  }

  @MessagePattern({ cmd: "checkFollowStatus" })
  async checkFollowStatus(
    @Payload() payload: { followerId: string; followingId: string },
  ) {
    return await this.socialService.isFollowing(
      payload.followerId,
      payload.followingId,
    );
  }
}
