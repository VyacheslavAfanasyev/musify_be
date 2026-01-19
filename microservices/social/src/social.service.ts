import { Injectable, Inject, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import {
  Follow,
  FollowDocument,
  IBaseResponse,
  getErrorMessage,
} from "@app/shared";

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(
    @InjectModel(Follow.name)
    private followModel: Model<FollowDocument>,
    @Inject("USER_SERVICE") private userClient: ClientProxy,
  ) {}

  /**
   * Подписка на пользователя
   */
  async followUser(
    followerId: string,
    followingId: string,
  ): Promise<IBaseResponse> {
    try {
      // Проверка: нельзя подписаться на самого себя
      if (followerId === followingId) {
        return {
          success: false,
          error: "Cannot follow yourself",
        };
      }

      // Пытаемся создать новую подписку
      // Уникальный индекс MongoDB предотвратит дубликаты
      // Это более надежно, чем проверка + создание, так как избегает race condition
      const follow = new this.followModel({
        followerId,
        followingId,
      });

      await follow.save();

      // Обновляем счетчики и список подписок в User Service
      try {
        // Увеличиваем followingCount для подписчика
        await firstValueFrom(
          this.userClient.send(
            { cmd: "updateFollowingCount" },
            { userId: followerId, delta: 1 },
          ),
        );

        // Добавляем followingId в список подписок пользователя
        await firstValueFrom(
          this.userClient.send(
            { cmd: "updateFollowingList" },
            { userId: followerId, followingId, action: "add" },
          ),
        );

        // Увеличиваем followersCount для того, на кого подписались
        await firstValueFrom(
          this.userClient.send(
            { cmd: "updateFollowersCount" },
            { userId: followingId, delta: 1 },
          ),
        );
      } catch (error) {
        this.logger.error(
          `Failed to update counters after follow: ${getErrorMessage(error)}`,
        );
        // Не прерываем выполнение, так как подписка уже создана
      }

      return {
        success: true,
      };
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      // Обработка ошибки дубликата (если подписка уже существует)
      // Это может произойти при race condition, когда два запроса приходят одновременно
      if (
        errorMessage.includes("duplicate key") ||
        errorMessage.includes("E11000")
      ) {
        return {
          success: false,
          error: "Already following this user",
        };
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Отписка от пользователя
   */
  async unfollowUser(
    followerId: string,
    followingId: string,
  ): Promise<IBaseResponse> {
    try {
      // Находим и удаляем подписку
      const result = await this.followModel.deleteOne({
        followerId,
        followingId,
      });

      if (result.deletedCount === 0) {
        return {
          success: false,
          error: "Not following this user",
        };
      }

      // Обновляем счетчики и список подписок в User Service
      try {
        // Уменьшаем followingCount для подписчика
        await firstValueFrom(
          this.userClient.send(
            { cmd: "updateFollowingCount" },
            { userId: followerId, delta: -1 },
          ),
        );

        // Удаляем followingId из списка подписок пользователя
        await firstValueFrom(
          this.userClient.send(
            { cmd: "updateFollowingList" },
            { userId: followerId, followingId, action: "remove" },
          ),
        );

        // Уменьшаем followersCount для того, от кого отписались
        await firstValueFrom(
          this.userClient.send(
            { cmd: "updateFollowersCount" },
            { userId: followingId, delta: -1 },
          ),
        );
      } catch (error) {
        this.logger.error(
          `Failed to update counters after unfollow: ${getErrorMessage(error)}`,
        );
        // Не прерываем выполнение, так как отписка уже выполнена
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to unfollow user"),
      };
    }
  }

  /**
   * Получить список подписчиков пользователя
   */
  async getFollowers(
    userId: string,
  ): Promise<
    { success: true; followers: string[] } | { success: false; error: string }
  > {
    try {
      const follows = await this.followModel
        .find({ followingId: userId })
        .select("followerId")
        .lean();

      const followers = follows.map((follow) => follow.followerId);

      return {
        success: true,
        followers,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get followers"),
      };
    }
  }

  /**
   * Получить список подписок пользователя
   */
  async getFollowing(
    userId: string,
  ): Promise<
    { success: true; following: string[] } | { success: false; error: string }
  > {
    try {
      const follows = await this.followModel
        .find({ followerId: userId })
        .select("followingId")
        .lean();

      const following = follows.map((follow) => follow.followingId);

      return {
        success: true,
        following,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get following"),
      };
    }
  }

  /**
   * Проверить, подписан ли пользователь на другого пользователя
   */
  async isFollowing(
    followerId: string,
    followingId: string,
  ): Promise<
    { success: true; isFollowing: boolean } | { success: false; error: string }
  > {
    try {
      const follow = await this.followModel.findOne({
        followerId,
        followingId,
      });

      return {
        success: true,
        isFollowing: !!follow,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to check follow status"),
      };
    }
  }
}
