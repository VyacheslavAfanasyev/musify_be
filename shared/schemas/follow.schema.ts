import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FollowDocument = HydratedDocument<Follow>;

/**
 * Follow - схема для MongoDB
 * Хранит связи подписок между пользователями
 */
@Schema({ timestamps: true })
export class Follow {
  @Prop({ required: true, index: true })
  followerId: string; // userId подписчика

  @Prop({ required: true, index: true })
  followingId: string; // userId на кого подписались

  createdAt?: Date;
  updatedAt?: Date;
}

export const FollowSchema = SchemaFactory.createForClass(Follow);

// Составной индекс для уникальности пары (followerId, followingId)
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

