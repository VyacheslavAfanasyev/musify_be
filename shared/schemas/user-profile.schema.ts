import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type UserProfileDocument = UserProfile & Document;

/**
 * UserProfile - схема для MongoDB
 * Хранит все социальные данные пользователя
 */
@Schema({ timestamps: true })
export class UserProfile {
  @Prop({ required: true, unique: true, index: true })
  userId: string; // UUID из PostgreSQL

  @Prop({ required: true, unique: true, index: true })
  username: string;

  @Prop()
  displayName?: string;

  @Prop()
  bio?: string;

  @Prop()
  avatarUrl?: string;

  @Prop()
  coverImageUrl?: string;

  @Prop()
  location?: string;

  @Prop({ type: [String], default: [] })
  genres: string[];

  @Prop({ type: [String], default: [] })
  instruments: string[];

  @Prop({
    type: {
      youtube: String,
      vk: String,
      telegram: String,
    },
    default: {},
  })
  socialLinks: {
    youtube?: string;
    vk?: string;
    telegram?: string;
  };

  @Prop({
    type: {
      tracksCount: { type: Number, default: 0 },
      followersCount: { type: Number, default: 0 },
      followingCount: { type: Number, default: 0 },
      totalPlays: { type: Number, default: 0 },
    },
    default: {},
  })
  stats: {
    tracksCount: number;
    followersCount: number;
    followingCount: number;
    totalPlays: number;
  };

  @Prop({ type: [String], default: [] })
  following: string[]; // Массив userId пользователей, на которых подписан

  @Prop({
    type: {
      emailNotifications: { type: Boolean, default: true },
      showOnlineStatus: { type: Boolean, default: true },
      privateProfile: { type: Boolean, default: false },
    },
    default: {},
  })
  preferences: {
    emailNotifications: boolean;
    showOnlineStatus: boolean;
    privateProfile: boolean;
  };

  @Prop({
    type: String,
    enum: ["musician", "listener", "admin"],
    default: "listener",
  })
  role: "musician" | "listener" | "admin";

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserProfileSchema = SchemaFactory.createForClass(UserProfile);
