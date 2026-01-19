import { Injectable, Inject, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ClientProxy } from "@nestjs/microservices";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { firstValueFrom } from "rxjs";
import {
  Follow,
  FollowDocument,
  IBaseResponse,
  getErrorMessage,
  IFeedItem,
  IPublicProfile,
  IUserProfile,
  IMediaFileResponse,
} from "@app/shared";

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);
  private readonly FEED_CACHE_TTL = 10 * 60 * 1000; // 10 минут

  constructor(
    @InjectModel(Follow.name)
    private followModel: Model<FollowDocument>,
    @Inject("USER_SERVICE") private userClient: ClientProxy,
    @Inject("MEDIA_SERVICE") private mediaClient: ClientProxy,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
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

  /**
   * Получить ленту обновлений пользователя
   * Лента содержит события от пользователей, на которых подписан текущий пользователь
   */
  async getUserFeed(
    userId: string,
  ): Promise<
    { success: true; feed: IFeedItem[] } | { success: false; error: string }
  > {
    try {
      // Проверяем кэш
      const cacheKey = `feed:${userId}`;
      const cachedFeed = await this.cacheManager.get<IFeedItem[]>(cacheKey);

      if (cachedFeed) {
        this.logger.log(
          `[CACHE HIT] Feed found in cache for userId: ${userId}`,
        );
        return {
          success: true,
          feed: cachedFeed,
        };
      }

      this.logger.log(
        `[CACHE MISS] Feed not in cache, fetching for userId: ${userId}`,
      );

      // Получаем список подписок пользователя
      const followingResult = await this.getFollowing(userId);
      if (followingResult.success === false) {
        return {
          success: false,
          error: followingResult.error || "Failed to get following list",
        };
      }

      const followingIds = followingResult.following;

      if (followingIds.length === 0) {
        // Если нет подписок, возвращаем пустую ленту
        const emptyFeed: IFeedItem[] = [];
        await this.cacheManager.set(cacheKey, emptyFeed, this.FEED_CACHE_TTL);
        return {
          success: true,
          feed: emptyFeed,
        };
      }

      // Получаем профили всех подписок для получения username и avatarUrl
      const feedItems: IFeedItem[] = [];

      for (const followingId of followingIds) {
        try {
          const profileResult = await firstValueFrom(
            this.userClient.send<{ success: boolean; profile?: IUserProfile }>(
              { cmd: "getProfileByUserId" },
              { userId: followingId },
            ),
          );

          if (profileResult.success && profileResult.profile) {
            const profile = profileResult.profile;

            // Получаем последние треки пользователя (например, последние 5)
            const tracksResult = await firstValueFrom(
              this.mediaClient.send<
                | { success: true; tracks: IMediaFileResponse[] }
                | { success: false; error: string }
              >({ cmd: "getUserTracks" }, { userId: followingId }),
            );

            if (tracksResult.success && tracksResult.tracks) {
              // Добавляем события для каждого трека
              for (const track of tracksResult.tracks.slice(0, 5)) {
                feedItems.push({
                  userId: followingId,
                  username: profile.username,
                  avatarUrl: profile.avatarUrl,
                  action: "track_published",
                  trackId: track.fileId,
                  trackTitle: track.originalName,
                  createdAt: track.createdAt || new Date(),
                });
              }
            }
          }
        } catch (error) {
          this.logger.error(
            `Failed to get feed items for user ${followingId}: ${getErrorMessage(error)}`,
          );
          // Продолжаем обработку других пользователей
        }
      }

      // Сортируем по дате создания (новые первыми)
      feedItems.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      // Ограничиваем ленту последними 50 событиями
      const limitedFeed = feedItems.slice(0, 50);

      // Кэшируем результат
      await this.cacheManager.set(cacheKey, limitedFeed, this.FEED_CACHE_TTL);
      this.logger.log(`[CACHE SET] Feed cached for userId: ${userId}`);

      return {
        success: true,
        feed: limitedFeed,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get user feed"),
      };
    }
  }

  /**
   * Обработка события публикации нового трека
   * Обновляет ленты всех подписчиков пользователя
   */
  async handleTrackPublished(data: {
    userId: string;
    trackId: string;
    trackTitle: string;
  }): Promise<void> {
    try {
      this.logger.log(
        `Handling track published event: userId=${data.userId}, trackId=${data.trackId}`,
      );

      // Получаем список подписчиков пользователя
      const followersResult = await this.getFollowers(data.userId);
      if (!followersResult.success || followersResult.followers.length === 0) {
        return;
      }

      // Получаем профиль пользователя для username и avatarUrl
      const profileResult = await firstValueFrom(
        this.userClient.send<{ success: boolean; profile?: IUserProfile }>(
          { cmd: "getProfileByUserId" },
          { userId: data.userId },
        ),
      );

      if (!profileResult.success || !profileResult.profile) {
        this.logger.error(`Failed to get profile for userId: ${data.userId}`);
        return;
      }

      const profile = profileResult.profile;

      // Создаем новое событие для ленты
      const feedItem: IFeedItem = {
        userId: data.userId,
        username: profile.username,
        avatarUrl: profile.avatarUrl,
        action: "track_published",
        trackId: data.trackId,
        trackTitle: data.trackTitle,
        createdAt: new Date(),
      };

      // Обновляем кэш ленты для каждого подписчика
      for (const followerId of followersResult.followers) {
        try {
          const cacheKey = `feed:${followerId}`;
          const cachedFeed = await this.cacheManager.get<IFeedItem[]>(cacheKey);

          if (cachedFeed) {
            // Добавляем новое событие в начало ленты
            const updatedFeed = [feedItem, ...cachedFeed].slice(0, 50);
            await this.cacheManager.set(
              cacheKey,
              updatedFeed,
              this.FEED_CACHE_TTL,
            );
            this.logger.log(`Updated feed cache for follower: ${followerId}`);
          }
          // Если кэша нет, он будет создан при следующем запросе ленты
        } catch (error) {
          this.logger.error(
            `Failed to update feed cache for follower ${followerId}: ${getErrorMessage(error)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle track published event: ${getErrorMessage(error)}`,
      );
    }
  }

  /**
   * Получить публичную страницу пользователя
   * Включает профиль, треки, статистику, подписки/подписчиков
   */
  async getPublicProfile(
    username: string,
    viewerId?: string,
  ): Promise<
    | { success: true; profile: IPublicProfile }
    | { success: false; error: string }
  > {
    try {
      // Получаем профиль пользователя по username
      const profileResult = await firstValueFrom(
        this.userClient.send<
          | { success: true; profile: IUserProfile }
          | { success: false; error: string }
        >({ cmd: "getProfileByUsername" }, { username }),
      );

      if (profileResult.success === false) {
        return {
          success: false,
          error: profileResult.error || "User not found",
        };
      }

      if (!profileResult.profile) {
        return {
          success: false,
          error: "User not found",
        };
      }

      const userProfile = profileResult.profile;

      // Проверяем настройку приватности профиля
      if (userProfile.preferences?.privateProfile) {
        // Если профиль приватный, проверяем, является ли viewer владельцем или подписчиком
        const isOwnProfile = viewerId === userProfile.userId;

        if (!isOwnProfile && viewerId) {
          // Проверяем, подписан ли viewer на этого пользователя
          const followStatus = await this.isFollowing(
            viewerId,
            userProfile.userId,
          );

          if (!followStatus.success || !followStatus.isFollowing) {
            return {
              success: false,
              error: "Profile is private",
            };
          }
        } else if (!isOwnProfile && !viewerId) {
          // Неавторизованный пользователь не может видеть приватный профиль
          return {
            success: false,
            error: "Profile is private",
          };
        }
      }

      // Получаем треки пользователя
      const tracksResult = await firstValueFrom(
        this.mediaClient.send<
          | { success: true; tracks: IMediaFileResponse[] }
          | { success: false; error: string }
        >({ cmd: "getUserTracks" }, { userId: userProfile.userId }),
      );

      const tracks = tracksResult.success ? tracksResult.tracks : [];

      // Получаем количество подписчиков и подписок
      const followersResult = await this.getFollowers(userProfile.userId);
      const followingResult = await this.getFollowing(userProfile.userId);

      const followersCount =
        followersResult.success && followersResult.followers
          ? followersResult.followers.length
          : userProfile.stats?.followersCount || 0;

      const followingCount =
        followingResult.success && followingResult.following
          ? followingResult.following.length
          : userProfile.stats?.followingCount || 0;

      // Проверяем, подписан ли viewer на этого пользователя
      let isFollowing = false;
      if (viewerId && viewerId !== userProfile.userId) {
        const followStatus = await this.isFollowing(
          viewerId,
          userProfile.userId,
        );
        isFollowing = followStatus.success ? followStatus.isFollowing : false;
      }

      const publicProfile: IPublicProfile = {
        profile: userProfile,
        tracks,
        followersCount,
        followingCount,
        isFollowing,
        isOwnProfile: viewerId === userProfile.userId,
      };

      return {
        success: true,
        profile: publicProfile,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get public profile"),
      };
    }
  }
}
