import { Controller } from "@nestjs/common";
import { MessagePattern, EventPattern, Payload } from "@nestjs/microservices";
import { UsersService } from "./users.service";
import type { ICreateUserProfileDto, IUpdateUserProfileDto } from "@app/shared";

@Controller()
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern({ cmd: "getHello" })
  getHello(): string {
    return "Hello World from USER-SERVICE!";
  }

  /**
   * Обработка события создания пользователя (Event-Driven)
   * Это событие отправляется после успешного создания профиля через Saga Pattern
   * Используется для уведомления других сервисов о создании пользователя
   * Профиль уже создан синхронно, поэтому здесь кэшируем email для агрегации данных
   */
  @EventPattern("user.created")
  async handleUserCreated(
    @Payload()
    data: {
      userId: string;
      email: string;
      username: string;
      role?: string;
    },
  ) {
    console.log(
      `[EVENT] user.created received: ${data.userId} (profile already created via Saga Pattern)`,
    );
    // Кэшируем email для использования в методах агрегации данных
    await this.usersService.cacheUserEmail(data.userId, data.email);
  }

  /**
   * Обработка события обновления профиля пользователя
   */
  @EventPattern("user.updated")
  handleUserUpdated(
    @Payload()
    data: {
      userId: string;
      updateDto: any;
    },
  ) {
    console.log(`[EVENT] user.updated received: ${data.userId}`);
    // Это событие можно использовать для синхронизации данных между сервисами
    // Пока оставляем пустым, так как обновление профиля происходит через MessagePattern
  }

  /**
   * Обработка события удаления пользователя
   */
  @EventPattern("user.deleted")
  async handleUserDeleted(@Payload() data: { userId: string }) {
    console.log(`[EVENT] user.deleted received: ${data.userId}`);
    await this.usersService.deleteProfile(data.userId);
  }

  /**
   * Обработка события создания подписки (follow)
   */
  @EventPattern("follow.created")
  async handleFollowCreated(
    @Payload()
    data: {
      followerId: string;
      followingId: string;
    },
  ) {
    console.log(
      `[EVENT] follow.created received: ${data.followerId} -> ${data.followingId}`,
    );
    try {
      // Увеличиваем followingCount для подписчика
      await this.usersService.updateFollowingCount(data.followerId, 1);
      // Добавляем followingId в список подписок пользователя
      await this.usersService.updateFollowingList(
        data.followerId,
        data.followingId,
        "add",
      );
      // Увеличиваем followersCount для того, на кого подписались
      await this.usersService.updateFollowersCount(data.followingId, 1);
    } catch (error) {
      console.error(
        `[EVENT] Error handling follow.created: ${data.followerId} -> ${data.followingId}`,
        error,
      );
    }
  }

  /**
   * Обработка события удаления подписки (unfollow)
   */
  @EventPattern("follow.deleted")
  async handleFollowDeleted(
    @Payload()
    data: {
      followerId: string;
      followingId: string;
    },
  ) {
    console.log(
      `[EVENT] follow.deleted received: ${data.followerId} -> ${data.followingId}`,
    );
    try {
      // Уменьшаем followingCount для подписчика
      await this.usersService.updateFollowingCount(data.followerId, -1);
      // Удаляем followingId из списка подписок пользователя
      await this.usersService.updateFollowingList(
        data.followerId,
        data.followingId,
        "remove",
      );
      // Уменьшаем followersCount для того, от кого отписались
      await this.usersService.updateFollowersCount(data.followingId, -1);
    } catch (error) {
      console.error(
        `[EVENT] Error handling follow.deleted: ${data.followerId} -> ${data.followingId}`,
        error,
      );
    }
  }

  /**
   * Обработка события загрузки трека
   */
  @EventPattern("media.track.uploaded")
  async handleTrackUploaded(
    @Payload()
    data: {
      userId: string;
      trackId: string;
      trackTitle: string;
    },
  ) {
    console.log(
      `[EVENT] media.track.uploaded received: userId=${data.userId}, trackId=${data.trackId}`,
    );
    try {
      // Увеличиваем счетчик треков
      await this.usersService.updateTracksCount(data.userId, 1);
    } catch (error) {
      console.error(
        `[EVENT] Error handling media.track.uploaded for userId ${data.userId}:`,
        error,
      );
    }
  }

  /**
   * Обработка события удаления трека
   */
  @EventPattern("media.track.deleted")
  async handleTrackDeleted(
    @Payload()
    data: {
      userId: string;
      trackId: string;
    },
  ) {
    console.log(
      `[EVENT] media.track.deleted received: userId=${data.userId}, trackId=${data.trackId}`,
    );
    try {
      // Уменьшаем счетчик треков
      await this.usersService.updateTracksCount(data.userId, -1);
    } catch (error) {
      console.error(
        `[EVENT] Error handling media.track.deleted for userId ${data.userId}:`,
        error,
      );
    }
  }

  /**
   * Обработка события загрузки аватарки
   */
  @EventPattern("media.avatar.uploaded")
  async handleAvatarUploaded(
    @Payload()
    data: {
      userId: string;
      avatarUrl: string;
    },
  ) {
    console.log(
      `[EVENT] media.avatar.uploaded received: userId=${data.userId}, avatarUrl=${data.avatarUrl}`,
    );
    try {
      // Обновляем аватарку в профиле
      await this.usersService.updateProfile(data.userId, {
        avatarUrl: data.avatarUrl,
      });
    } catch (error) {
      console.error(
        `[EVENT] Error handling media.avatar.uploaded for userId ${data.userId}:`,
        error,
      );
    }
  }

  /**
   * Обработка события удаления аватарки
   */
  @EventPattern("media.avatar.deleted")
  async handleAvatarDeleted(@Payload() data: { userId: string }) {
    console.log(`[EVENT] media.avatar.deleted received: userId=${data.userId}`);
    try {
      // Очищаем аватарку в профиле
      await this.usersService.updateProfile(data.userId, {
        avatarUrl: null,
      });
    } catch (error) {
      console.error(
        `[EVENT] Error handling media.avatar.deleted for userId ${data.userId}:`,
        error,
      );
    }
  }

  /**
   * Обработка события отката создания пользователя
   */
  @EventPattern("user.create.failed")
  async handleUserCreateFailed(@Payload() data: { userId: string }) {
    await this.usersService.deleteProfile(data.userId);
  }

  @MessagePattern({ cmd: "getProfileByUserId" })
  async getProfileByUserId(@Payload() payload: { userId: string }) {
    try {
      return await this.usersService.getProfileByUserId(payload.userId);
    } catch (error) {
      console.error("Error in getProfileByUserId:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  @MessagePattern({ cmd: "getProfileByUsername" })
  async getProfileByUsername(@Payload() payload: { username: string }) {
    return await this.usersService.getProfileByUsername(payload.username);
  }

  /**
   * Получение полного профиля пользователя с email (агрегация данных)
   * Заменяет агрегацию в API Gateway
   */
  @MessagePattern({ cmd: "getUserProfile" })
  async getUserProfile(@Payload() payload: { userId: string }) {
    try {
      return await this.usersService.getUserProfile(payload.userId);
    } catch (error) {
      console.error("Error in getUserProfile:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Получение профиля по username с email (агрегация данных)
   * Заменяет агрегацию в API Gateway
   */
  @MessagePattern({ cmd: "getUserProfileByUsername" })
  async getUserProfileByUsername(@Payload() payload: { username: string }) {
    try {
      return await this.usersService.getUserProfileByUsername(payload.username);
    } catch (error) {
      console.error("Error in getUserProfileByUsername:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Синхронное создание профиля (для использования в Saga Pattern)
   */
  @MessagePattern({ cmd: "createProfile" })
  createProfile(@Payload() data: ICreateUserProfileDto) {
    return this.usersService.createProfile(data);
  }

  @MessagePattern({ cmd: "updateProfile" })
  async updateProfile(
    @Payload()
    payload: {
      userId: string;
      updateDto: IUpdateUserProfileDto;
    },
  ) {
    return await this.usersService.updateProfile(
      payload.userId,
      payload.updateDto,
    );
  }

  @MessagePattern({ cmd: "updateTracksCount" })
  async updateTracksCount(
    @Payload()
    payload: {
      userId: string;
      delta: number;
    },
  ) {
    return await this.usersService.updateTracksCount(
      payload.userId,
      payload.delta,
    );
  }

  @MessagePattern({ cmd: "updateFollowersCount" })
  async updateFollowersCount(
    @Payload()
    payload: {
      userId: string;
      delta: number;
    },
  ) {
    return await this.usersService.updateFollowersCount(
      payload.userId,
      payload.delta,
    );
  }

  @MessagePattern({ cmd: "updateFollowingCount" })
  async updateFollowingCount(
    @Payload()
    payload: {
      userId: string;
      delta: number;
    },
  ) {
    return await this.usersService.updateFollowingCount(
      payload.userId,
      payload.delta,
    );
  }

  @MessagePattern({ cmd: "updateFollowingList" })
  async updateFollowingList(
    @Payload()
    payload: {
      userId: string;
      followingId: string;
      action: "add" | "remove";
    },
  ) {
    return await this.usersService.updateFollowingList(
      payload.userId,
      payload.followingId,
      payload.action,
    );
  }

  @MessagePattern({ cmd: "updateTotalPlays" })
  async updateTotalPlays(
    @Payload()
    payload: {
      userId: string;
      delta: number;
    },
  ) {
    return await this.usersService.updateTotalPlays(
      payload.userId,
      payload.delta,
    );
  }

  @MessagePattern({ cmd: "deleteProfile" })
  deleteProfile(@Payload() payload: { userId: string }) {
    return this.usersService.deleteProfile(payload.userId);
  }

  @MessagePattern({ cmd: "getAllProfiles" })
  async getAllProfiles() {
    return await this.usersService.findAll();
  }

  @MessagePattern({ cmd: "getUserByEmail" })
  getUserByEmail() {
    return {
      success: false,
      error: "User data is now in Auth Service",
    };
  }

  @MessagePattern({ cmd: "getUserById" })
  async getUserById(@Payload() payload: { id: string }) {
    return await this.usersService.getProfileByUserId(payload.id);
  }

  @MessagePattern({ cmd: "getAllUsers" })
  async getAllUsers() {
    return await this.usersService.findAll();
  }

  @MessagePattern({ cmd: "updatePassword" })
  updatePassword() {
    return {
      success: false,
      error: "Password update is now in Auth Service",
    };
  }
}
