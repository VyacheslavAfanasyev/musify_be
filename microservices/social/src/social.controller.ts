import { Controller } from "@nestjs/common";
import { MessagePattern, EventPattern, Payload } from "@nestjs/microservices";
import { SocialService } from "./social.service";
import type { IFollowDto, UserRole } from "@app/shared";

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

  @MessagePattern({ cmd: "getUserFeed" })
  async getUserFeed(@Payload() payload: { userId: string }) {
    return await this.socialService.getUserFeed(payload.userId);
  }

  @MessagePattern({ cmd: "getPublicProfile" })
  async getPublicProfile(
    @Payload() payload: { username: string; viewerId?: string },
  ) {
    return await this.socialService.getPublicProfile(
      payload.username,
      payload.viewerId,
    );
  }

  @EventPattern("user.track.published")
  async handleTrackPublished(
    @Payload() payload: { userId: string; trackId: string; trackTitle: string },
  ) {
    await this.socialService.handleTrackPublished(payload);
  }

  /**
   * Обработка события создания пользователя
   * Создает локальную реплику профиля для чтения
   * Примечание: событие содержит минимальные данные, полные данные будут синхронизированы
   * через событие user.updated или при первом обращении к профилю
   */
  @EventPattern("user.created")
  async handleUserCreated(
    @Payload()
    data: {
      userId: string;
      email: string;
      username: string;
      role?: UserRole;
    },
  ) {
    // Создаем базовую реплику с минимальными данными
    // Полные данные будут синхронизированы через события user.updated
    await this.socialService.syncUserProfile({
      userId: data.userId,
      username: data.username,
      role: data.role || ("listener" as UserRole),
      stats: {
        tracksCount: 0,
        followersCount: 0,
        followingCount: 0,
        totalPlays: 0,
      },
      preferences: {
        emailNotifications: true,
        showOnlineStatus: true,
        privateProfile: false,
      },
    });
  }

  /**
   * Обработка события обновления профиля пользователя
   * Обновляет локальную реплику профиля
   */
  @EventPattern("user.updated")
  async handleUserUpdated(
    @Payload()
    data: {
      userId: string;
      updateDto: any;
    },
  ) {
    await this.socialService.updateUserProfileReplica(
      data.userId,
      data.updateDto,
    );
  }

  /**
   * Обработка события удаления пользователя
   * Удаляет локальную реплику профиля
   */
  @EventPattern("user.deleted")
  async handleUserDeleted(@Payload() data: { userId: string }) {
    await this.socialService.deleteUserProfileReplica(data.userId);
  }

  /**
   * Обработка события загрузки аватарки
   * Обновляет avatarUrl в локальной реплике
   */
  @EventPattern("media.avatar.uploaded")
  async handleAvatarUploaded(
    @Payload() data: { userId: string; avatarUrl: string },
  ) {
    await this.socialService.updateUserProfileReplica(data.userId, {
      avatarUrl: data.avatarUrl,
    });
  }

  /**
   * Обработка события удаления аватарки
   * Очищает avatarUrl в локальной реплике
   */
  @EventPattern("media.avatar.deleted")
  async handleAvatarDeleted(@Payload() data: { userId: string }) {
    await this.socialService.updateUserProfileReplica(data.userId, {
      avatarUrl: null,
    });
  }

  /**
   * Обработка события обновления счетчиков подписок
   * Обновляет статистику в локальной реплике
   */
  @EventPattern("follow.created")
  async handleFollowCreated(
    @Payload() data: { followerId: string; followingId: string },
  ) {
    await this.socialService.updateFollowStats(
      data.followerId,
      data.followingId,
      "add",
    );
  }

  @EventPattern("follow.deleted")
  async handleFollowDeleted(
    @Payload() data: { followerId: string; followingId: string },
  ) {
    await this.socialService.updateFollowStats(
      data.followerId,
      data.followingId,
      "remove",
    );
  }

  /**
   * Компенсирующее действие для удаления подписки (используется в Saga Pattern)
   */
  @MessagePattern({ cmd: "compensateUnfollow" })
  async compensateUnfollow(
    @Payload()
    payload: {
      followerId: string;
      followingId: string;
      sagaId?: string;
    },
  ) {
    try {
      const result = await this.socialService.unfollowUser(
        payload.followerId,
        payload.followingId,
      );
      return { success: true, result };
    } catch (error) {
      console.error("Error in compensateUnfollow:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Компенсирующее действие для удаления реплики профиля (используется в Saga Pattern)
   */
  @MessagePattern({ cmd: "compensateDeleteProfileReplica" })
  async compensateDeleteProfileReplica(
    @Payload() payload: { userId: string; sagaId?: string },
  ) {
    try {
      await this.socialService.deleteUserProfileReplica(payload.userId);
      return { success: true };
    } catch (error) {
      console.error("Error in compensateDeleteProfileReplica:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
