export interface IUserProfile {
  _id?: string;
  userId: string; // UUID из PostgreSQL
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  location?: string;
  genres: string[];
  instruments: string[];
  socialLinks: {
    youtube?: string;
    vk?: string;
    telegram?: string;
  };
  stats: {
    tracksCount: number;
    followersCount: number;
    followingCount: number;
    totalPlays: number;
  };
  preferences: {
    emailNotifications: boolean;
    showOnlineStatus: boolean;
    privateProfile: boolean;
  };
  role: "musician" | "listener" | "admin";
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateUserProfileDto {
  userId: string;
  username: string;
  role?: "musician" | "listener" | "admin";
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  location?: string;
  genres?: string[];
  instruments?: string[];
  socialLinks?: {
    youtube?: string;
    vk?: string;
    telegram?: string;
  };
}

export interface IUpdateUserProfileDto {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  location?: string;
  genres?: string[];
  instruments?: string[];
  socialLinks?: {
    youtube?: string;
    vk?: string;
    telegram?: string;
  };
  preferences?: {
    emailNotifications?: boolean;
    showOnlineStatus?: boolean;
    privateProfile?: boolean;
  };
}

