import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MediaFileDocument = HydratedDocument<MediaFile>;

/**
 * MediaFile - схема для MongoDB
 * Хранит метаданные загруженных файлов (аватары, треки, обложки)
 */
@Schema({ timestamps: true })
export class MediaFile {
  @Prop({ required: true, unique: true, index: true })
  fileId: string; // UUID

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, enum: ['avatar', 'track', 'cover', 'other'] })
  type: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true, unique: true })
  fileName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  path: string;

  @Prop({ required: true })
  url: string;

  @Prop({
    type: {
      duration: Number,
      bitrate: Number,
      format: String,
      width: Number,
      height: Number,
    },
  })
  metadata?: {
    duration?: number;
    bitrate?: number;
    format?: string;
    width?: number;
    height?: number;
  };

  createdAt?: Date;
  updatedAt?: Date;
}

export const MediaFileSchema = SchemaFactory.createForClass(MediaFile);

