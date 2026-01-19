import { Injectable, Inject } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { Model } from "mongoose";
import {
  ICreateUserProfileDto,
  IUpdateUserProfileDto,
  IBaseResponse,
  getErrorMessage,
  UserProfile,
  UserProfileDocument,
} from "@app/shared";

@Injectable()
export class UsersService {
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 минут в миллисекундах

  constructor(
    @InjectModel(UserProfile.name)
    private userProfileModel: Model<UserProfileDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async createProfile(
    createProfileDto: ICreateUserProfileDto,
  ): Promise<
    | { success: true; profile: UserProfileDocument }
    | { success: false; error: string }
  > {
    try {
      // Валидация обязательных полей
      if (!createProfileDto.userId) {
        console.error("createProfile: userId is required");
        return {
          success: false,
          error: "userId is required",
        };
      }

      if (!createProfileDto.username) {
        console.error("createProfile: username is required");
        return {
          success: false,
          error: "username is required",
        };
      }

      const existingProfile = await this.userProfileModel
        .findOne({
          $or: [
            { userId: createProfileDto.userId },
            { username: createProfileDto.username },
          ],
        })
        .maxTimeMS(10000)
        .exec();

      if (existingProfile) {
        console.error("createProfile: Profile already exists", {
          existingUserId: existingProfile.userId,
          existingUsername: existingProfile.username,
        });
        return {
          success: false,
          error: "Profile already exists",
        };
      }

      const profileData = {
        userId: createProfileDto.userId,
        username: createProfileDto.username,
        role: createProfileDto.role || "listener",
        displayName: createProfileDto.displayName,
        bio: createProfileDto.bio,
        avatarUrl: createProfileDto.avatarUrl,
        coverImageUrl: createProfileDto.coverImageUrl,
        location: createProfileDto.location,
        genres: createProfileDto.genres || [],
        instruments: createProfileDto.instruments || [],
        socialLinks: createProfileDto.socialLinks || {},
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
        following: [],
      };

      const profile = new this.userProfileModel(profileData);

      const savedProfile = await profile.save();

      // Кэшируем новый профиль
      await this.cacheProfile(savedProfile);

      return {
        success: true,
        profile: savedProfile,
      };
    } catch (error) {
      console.error("createProfile error:", error);
      // Обработка специфичных ошибок MongoDB
      if (error?.code === 11000) {
        // Duplicate key error
        const keyPattern =
          error && typeof error === "object" && "keyPattern" in error
            ? (error.keyPattern as Record<string, unknown>)
            : {};
        const duplicateField = Object.keys(keyPattern)[0];
        return {
          success: false,
          error: `Profile with this ${duplicateField} already exists`,
        };
      }

      if (error?.name === "ValidationError") {
        const errors =
          error &&
          typeof error === "object" &&
          "errors" in error &&
          typeof error.errors === "object" &&
          error.errors !== null
            ? (error.errors as Record<string, { message?: string }>)
            : {};
        const validationErrors = Object.values(errors)
          .map((err) => err?.message)
          .filter((msg): msg is string => typeof msg === "string");
        return {
          success: false,
          error: `Validation error: ${validationErrors.join(", ")}`,
        };
      }

      return {
        success: false,
        error: getErrorMessage(error, "Failed to create profile"),
      };
    }
  }

  /**
   * Получение профиля по userId с кэшированием
   */
  async getProfileByUserId(
    userId: string,
  ): Promise<
    | { success: true; profile: UserProfileDocument }
    | { success: false; error: string }
  > {
    try {
      // Пытаемся получить из кэша
      const cacheKey = `profile:userId:${userId}`;
      const cachedProfile =
        await this.cacheManager.get<UserProfileDocument>(cacheKey);

      if (cachedProfile) {
        console.log(`[CACHE HIT] Profile found in cache for userId: ${userId}`);
        return {
          success: true,
          profile: cachedProfile,
        };
      }

      console.log(
        `[CACHE MISS] Profile not in cache, fetching from MongoDB for userId: ${userId}`,
      );

      // Если нет в кэше, запрашиваем из MongoDB
      const profile = await this.userProfileModel
        .findOne({ userId })
        .maxTimeMS(5000)
        .exec();

      if (profile) {
        console.log(
          `[CACHE SET] Saving profile to cache for userId: ${userId}`,
        );
        // Сохраняем в кэш
        await this.cacheProfile(profile);
        return {
          success: true,
          profile,
        };
      }

      return {
        success: false,
        error: "Profile not found",
      };
    } catch (error) {
      const errorMessage = getErrorMessage(error, "Failed to find profile");
      // Проверяем, не таймаут ли это
      if (
        errorMessage.includes("operation timed out") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("MongoServerError")
      ) {
        return {
          success: false,
          error: "Database connection timeout or error",
        };
      }
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Получение профиля по username с кэшированием
   */
  async getProfileByUsername(
    username: string,
  ): Promise<
    | { success: true; profile: UserProfileDocument }
    | { success: false; error: string }
  > {
    try {
      // Пытаемся получить из кэша
      const cacheKey = `profile:username:${username}`;
      const cachedProfile =
        await this.cacheManager.get<UserProfileDocument>(cacheKey);

      if (cachedProfile) {
        console.log(
          `[CACHE HIT] Profile found in cache for username: ${username}`,
        );
        return {
          success: true,
          profile: cachedProfile,
        };
      }

      console.log(
        `[CACHE MISS] Profile not in cache, fetching from MongoDB for username: ${username}`,
      );

      // Если нет в кэше, запрашиваем из MongoDB
      const profile = await this.userProfileModel.findOne({ username });

      if (profile) {
        console.log(
          `[CACHE SET] Saving profile to cache for username: ${username}`,
        );
        // Сохраняем в кэш
        await this.cacheProfile(profile);
        return {
          success: true,
          profile,
        };
      }

      return {
        success: false,
        error: "Profile not found",
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to find profile"),
      };
    }
  }

  /**
   * Обновление профиля
   */
  async updateProfile(
    userId: string,
    updateDto: IUpdateUserProfileDto,
  ): Promise<IBaseResponse> {
    try {
      const profile = await this.userProfileModel.findOne({ userId });

      if (!profile) {
        return {
          success: false,
          error: "Profile not found",
        };
      }

      // Сохраняем username для инвалидации кэша
      const username = profile.username;

      // Обновляем поля профиля, явно обрабатывая null значения для очистки полей
      if (updateDto.avatarUrl !== undefined) {
        // null означает очистку поля, undefined означает отсутствие изменений
        profile.avatarUrl =
          updateDto.avatarUrl === null ? undefined : updateDto.avatarUrl;
      }
      if (updateDto.coverImageUrl !== undefined) {
        profile.coverImageUrl =
          updateDto.coverImageUrl === null
            ? undefined
            : updateDto.coverImageUrl;
      }
      if (updateDto.displayName !== undefined) {
        profile.displayName =
          updateDto.displayName === null ? undefined : updateDto.displayName;
      }
      if (updateDto.bio !== undefined) {
        profile.bio = updateDto.bio === null ? undefined : updateDto.bio;
      }
      if (updateDto.location !== undefined) {
        profile.location =
          updateDto.location === null ? undefined : updateDto.location;
      }
      if (updateDto.genres !== undefined) {
        profile.genres = updateDto.genres;
      }
      if (updateDto.instruments !== undefined) {
        profile.instruments = updateDto.instruments;
      }
      if (updateDto.socialLinks !== undefined) {
        profile.socialLinks = updateDto.socialLinks;
      }
      if (updateDto.preferences !== undefined) {
        profile.preferences = {
          ...profile.preferences,
          ...updateDto.preferences,
        };
      }

      const updatedProfile = await profile.save();

      // Инвалидируем кэш перед обновлением
      await this.invalidateProfileCache(userId, username);

      // Кэшируем обновленный профиль
      await this.cacheProfile(updatedProfile);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to update profile"),
      };
    }
  }

  /**
   * Обновление счетчика треков пользователя
   */
  async updateTracksCount(
    userId: string,
    delta: number,
  ): Promise<IBaseResponse> {
    try {
      const profile = await this.userProfileModel.findOne({ userId });

      if (!profile) {
        return {
          success: false,
          error: "Profile not found",
        };
      }

      // Сохраняем username для инвалидации кэша
      const username = profile.username;

      // Обновляем счетчик треков
      const currentCount = profile.stats?.tracksCount || 0;
      const newCount = Math.max(0, currentCount + delta);

      profile.stats = {
        ...profile.stats,
        tracksCount: newCount,
      };

      const updatedProfile = await profile.save();

      // Инвалидируем кэш перед обновлением
      await this.invalidateProfileCache(userId, username);

      // Кэшируем обновленный профиль
      await this.cacheProfile(updatedProfile);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to update tracks count"),
      };
    }
  }

  /**
   * Обновление счетчика подписчиков пользователя
   */
  async updateFollowersCount(
    userId: string,
    delta: number,
  ): Promise<IBaseResponse> {
    try {
      const profile = await this.userProfileModel.findOne({ userId });

      if (!profile) {
        return {
          success: false,
          error: "Profile not found",
        };
      }

      // Сохраняем username для инвалидации кэша
      const username = profile.username;

      // Обновляем счетчик подписчиков
      const currentCount = profile.stats?.followersCount || 0;
      const newCount = Math.max(0, currentCount + delta);

      profile.stats = {
        ...profile.stats,
        followersCount: newCount,
      };

      const updatedProfile = await profile.save();

      // Инвалидируем кэш перед обновлением
      await this.invalidateProfileCache(userId, username);

      // Кэшируем обновленный профиль
      await this.cacheProfile(updatedProfile);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to update followers count"),
      };
    }
  }

  /**
   * Обновление счетчика подписок пользователя
   */
  async updateFollowingCount(
    userId: string,
    delta: number,
  ): Promise<IBaseResponse> {
    try {
      const profile = await this.userProfileModel.findOne({ userId });

      if (!profile) {
        return {
          success: false,
          error: "Profile not found",
        };
      }

      // Сохраняем username для инвалидации кэша
      const username = profile.username;

      // Обновляем счетчик подписок
      const currentCount = profile.stats?.followingCount || 0;
      const newCount = Math.max(0, currentCount + delta);

      profile.stats = {
        ...profile.stats,
        followingCount: newCount,
      };

      const updatedProfile = await profile.save();

      // Инвалидируем кэш перед обновлением
      await this.invalidateProfileCache(userId, username);

      // Кэшируем обновленный профиль
      await this.cacheProfile(updatedProfile);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to update following count"),
      };
    }
  }

  /**
   * Обновление счетчика прослушиваний пользователя
   */
  async updateTotalPlays(
    userId: string,
    delta: number,
  ): Promise<IBaseResponse> {
    try {
      const profile = await this.userProfileModel.findOne({ userId });

      if (!profile) {
        return {
          success: false,
          error: "Profile not found",
        };
      }

      // Сохраняем username для инвалидации кэша
      const username = profile.username;

      // Обновляем счетчик прослушиваний
      const currentCount = profile.stats?.totalPlays || 0;
      const newCount = Math.max(0, currentCount + delta);

      profile.stats = {
        ...profile.stats,
        totalPlays: newCount,
      };

      const updatedProfile = await profile.save();

      // Инвалидируем кэш перед обновлением
      await this.invalidateProfileCache(userId, username);

      // Кэшируем обновленный профиль
      await this.cacheProfile(updatedProfile);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to update total plays"),
      };
    }
  }

  /**
   * Обновление списка подписок пользователя
   * Добавляет или удаляет userId из массива following
   */
  async updateFollowingList(
    userId: string,
    followingId: string,
    action: "add" | "remove",
  ): Promise<IBaseResponse> {
    try {
      const profile = await this.userProfileModel.findOne({ userId });

      if (!profile) {
        return {
          success: false,
          error: "Profile not found",
        };
      }

      // Сохраняем username для инвалидации кэша
      const username = profile.username;

      // Инициализируем массив following, если его нет
      if (!profile.following) {
        profile.following = [];
      }

      if (action === "add") {
        // Добавляем followingId, если его еще нет
        if (!profile.following.includes(followingId)) {
          profile.following.push(followingId);
        }
      } else if (action === "remove") {
        // Удаляем followingId из массива
        profile.following = profile.following.filter(
          (id) => id !== followingId,
        );
      }

      const updatedProfile = await profile.save();

      // Инвалидируем кэш перед обновлением
      await this.invalidateProfileCache(userId, username);

      // Кэшируем обновленный профиль
      await this.cacheProfile(updatedProfile);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to update following list"),
      };
    }
  }

  /**
   * Получение всех профилей
   */
  async findAll(): Promise<
    | { success: true; profiles: UserProfileDocument[] }
    | { success: false; error: string }
  > {
    try {
      const profiles = await this.userProfileModel.find();
      return {
        success: true,
        profiles,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get all profiles"),
      };
    }
  }

  /**
   * Удаление профиля (для отката при ошибке создания)
   */
  async deleteProfile(userId: string): Promise<IBaseResponse> {
    try {
      // Получаем профиль перед удалением для инвалидации кэша
      const profile = await this.userProfileModel.findOne({ userId });
      const username = profile?.username;

      const result = await this.userProfileModel.deleteOne({ userId });
      if (result.deletedCount === 0) {
        return {
          success: false,
          error: "Profile not found",
        };
      }

      // Инвалидируем кэш
      if (username) {
        await this.invalidateProfileCache(userId, username);
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to delete profile"),
      };
    }
  }

  /**
   * Кэширование профиля по userId и username
   */
  private async cacheProfile(profile: UserProfileDocument): Promise<void> {
    try {
      const userIdKey = `profile:userId:${profile.userId}`;
      const usernameKey = `profile:username:${profile.username}`;

      await Promise.all([
        this.cacheManager.set(userIdKey, profile, this.CACHE_TTL),
        this.cacheManager.set(usernameKey, profile, this.CACHE_TTL),
      ]);
      console.log(
        `[CACHE] Profile cached successfully for userId: ${profile.userId}, username: ${profile.username}`,
      );
    } catch (error) {
      // Логируем ошибку, но не прерываем выполнение
      console.error("[CACHE ERROR] Error caching profile:", error);
    }
  }

  /**
   * Инвалидация кэша профиля
   */
  private async invalidateProfileCache(
    userId: string,
    username?: string,
  ): Promise<void> {
    try {
      const keysToDelete = [`profile:userId:${userId}`];
      if (username) {
        keysToDelete.push(`profile:username:${username}`);
      }

      await Promise.all(keysToDelete.map((key) => this.cacheManager.del(key)));
      console.log(
        `[CACHE INVALIDATE] Cache invalidated for userId: ${userId}${username ? `, username: ${username}` : ""}`,
      );
    } catch (error) {
      // Логируем ошибку, но не прерываем выполнение
      console.error("[CACHE ERROR] Error invalidating profile cache:", error);
    }
  }
}
