export interface IFollow {
  _id?: string;
  followerId: string;
  followingId: string;
  createdAt?: Date;
}

export interface IFollowDto {
  followerId: string;
  followingId: string;
}

import type { IUserProfile } from "./user-profile";
import type { IMediaFileResponse } from "./media";

export interface IPublicProfile {
  profile: IUserProfile;
  tracks: IMediaFileResponse[];
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean; // для текущего пользователя
  isOwnProfile?: boolean;
}

export interface IFeedItem {
  userId: string;
  username: string;
  avatarUrl?: string;
  action: 'track_published' | 'profile_updated';
  trackId?: string;
  trackTitle?: string;
  createdAt: Date;
}

