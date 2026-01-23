import { Injectable, Inject } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { Model } from "mongoose";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom, timeout, catchError, throwError } from "rxjs";
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
  private readonly EMAIL_CACHE_TTL = 10 * 60 * 1000; // 10 минут для email

  constructor(
    @InjectModel(UserProfile.name)
    private userProfileModel: Model<UserProfileDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject("AUTH_SERVICE") private readonly authClient: ClientProxy,
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
      // Обработка специфичных ошибок MongoDB (user_db)
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
        `[CACHE MISS] Profile not in cache, fetching from MongoDB (user_db) for userId: ${userId}`,
      );

      // Если нет в кэше, запрашиваем из MongoDB (user_db)
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
        `[CACHE MISS] Profile not in cache, fetching from MongoDB (user_db) for username: ${username}`,
      );

      // Если нет в кэше, запрашиваем из MongoDB (user_db)
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

  /**
   * Получение email пользователя из кэша или Auth Service
   */
  private async getUserEmail(
    userId: string,
  ): Promise<
    { success: true; email: string } | { success: false; error?: string }
  > {
    try {
      // Пытаемся получить из кэша
      const cacheKey = `user:email:${userId}`;
      const cachedEmail = await this.cacheManager.get<string>(cacheKey);

      if (cachedEmail) {
        console.log(`[CACHE HIT] Email found in cache for userId: ${userId}`);
        return {
          success: true,
          email: cachedEmail,
        };
      }

      console.log(
        `[CACHE MISS] Email not in cache, fetching from Auth Service for userId: ${userId}`,
      );

      // Если нет в кэше, запрашиваем из Auth Service
      const authResult = await firstValueFrom(
        this.authClient
          .send<{
            success: boolean;
            user?: { id: string; email: string };
            error?: string;
          }>({ cmd: "getUserById" }, { id: userId })
          .pipe(
            timeout(10000), // 10 секунд таймаут
            catchError((error) => {
              if (error.name === "TimeoutError") {
                return throwError(
                  () => new Error("Auth Service timeout: getUserById"),
                );
              }
              return throwError(() => error);
            }),
          ),
      );

      if (authResult.success && authResult.user) {
        // Кэшируем email
        await this.cacheManager.set(
          cacheKey,
          authResult.user.email,
          this.EMAIL_CACHE_TTL,
        );
        return {
          success: true,
          email: authResult.user.email,
        };
      }

      return {
        success: false,
        error: authResult.error || "User not found",
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get user email"),
      };
    }
  }

  /**
   * Кэширование email пользователя
   */
  async cacheUserEmail(userId: string, email: string): Promise<void> {
    try {
      const cacheKey = `user:email:${userId}`;
      await this.cacheManager.set(cacheKey, email, this.EMAIL_CACHE_TTL);
      console.log(`[CACHE] Email cached successfully for userId: ${userId}`);
    } catch (error) {
      console.error("[CACHE ERROR] Error caching email:", error);
    }
  }

  /**
   * Получение полного профиля пользователя с email (агрегация данных)
   * Этот метод заменяет агрегацию в API Gateway
   */
  async getUserProfile(
    userId: string,
  ): Promise<{ success: true; user: any } | { success: false; error: string }> {
    try {
      // Получаем профиль из User Service
      const profileResult = await this.getProfileByUserId(userId);

      if (profileResult.success === false) {
        return {
          success: false,
          error: profileResult.error || "User profile not found",
        };
      }

      if (!profileResult.profile) {
        return {
          success: false,
          error: "User profile not found",
        };
      }

      // Получаем email из кэша или Auth Service
      const emailResult = await this.getUserEmail(userId);

      // Объединяем данные
      const profile = profileResult.profile.toObject
        ? profileResult.profile.toObject()
        : profileResult.profile;

      return {
        success: true,
        user: {
          id: userId,
          email: emailResult.success ? emailResult.email : undefined,
          ...profile,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get user profile"),
      };
    }
  }

  /**
   * Получение профиля по username с email (агрегация данных)
   * Этот метод заменяет агрегацию в API Gateway
   */
  async getUserProfileByUsername(
    username: string,
  ): Promise<{ success: true; user: any } | { success: false; error: string }> {
    try {
      // Получаем профиль из User Service
      const profileResult = await this.getProfileByUsername(username);

      if (profileResult.success === false) {
        return {
          success: false,
          error: profileResult.error || "Profile not found",
        };
      }

      if (!profileResult.profile) {
        return {
          success: false,
          error: "Profile not found",
        };
      }

      const profile = profileResult.profile.toObject
        ? profileResult.profile.toObject()
        : profileResult.profile;

      const userId = profile.userId || profile._id?.toString();

      if (!userId) {
        return {
          success: false,
          error: "User ID not found in profile",
        };
      }

      // Получаем email из кэша или Auth Service
      const emailResult = await this.getUserEmail(userId);

      return {
        success: true,
        user: {
          ...profile,
          email: emailResult.success ? emailResult.email : undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get user profile by username"),
      };
    }
  }
}
