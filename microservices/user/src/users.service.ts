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

  /**
   * Создание профиля пользователя (вызывается через событие user.created)
   */
  async createProfile(
    createProfileDto: ICreateUserProfileDto,
  ): Promise<
    | { success: true; profile: UserProfileDocument }
    | { success: false; error: string }
  > {
    try {
      // Проверяем, существует ли профиль
      const existingProfile = await this.userProfileModel.findOne({
        $or: [
          { userId: createProfileDto.userId },
          { username: createProfileDto.username },
        ],
      });

      if (existingProfile) {
        return {
          success: false,
          error: "Profile already exists",
        };
      }

      const profile = new this.userProfileModel({
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
      });

      const savedProfile = await profile.save();
      return {
        success: true,
        profile: savedProfile,
      };
    } catch (error) {
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
      const profile = await this.userProfileModel.findOne({ userId });
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
   * Проверка существования профиля
   */
  async checkProfileExists(userId: string): Promise<boolean> {
    try {
      const profile = await this.userProfileModel.findOne({ userId });
      return !!profile;
    } catch (error) {
      return false;
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
