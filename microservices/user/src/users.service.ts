import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
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
  constructor(
    @InjectModel(UserProfile.name)
    private userProfileModel: Model<UserProfileDocument>,
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
      };

      const profile = new this.userProfileModel(profileData);

      const savedProfile = await profile.save();

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
   * Получение профиля по userId
   */
  async getProfileByUserId(
    userId: string,
  ): Promise<
    | { success: true; profile: UserProfileDocument }
    | { success: false; error: string }
  > {
    try {
      // Добавляем таймаут 5 секунд для запроса к MongoDB
      const profile = await this.userProfileModel
        .findOne({ userId })
        .maxTimeMS(5000)
        .exec();
      if (profile) {
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
   * Получение профиля по username
   */
  async getProfileByUsername(
    username: string,
  ): Promise<
    | { success: true; profile: UserProfileDocument }
    | { success: false; error: string }
  > {
    try {
      const profile = await this.userProfileModel.findOne({ username });
      if (profile) {
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

      Object.assign(profile, updateDto);
      await profile.save();

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
      const result = await this.userProfileModel.deleteOne({ userId });
      if (result.deletedCount === 0) {
        return {
          success: false,
          error: "Profile not found",
        };
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
}
