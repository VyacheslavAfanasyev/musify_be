import { Injectable, Inject, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { Model } from "mongoose";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import {
  MediaFile,
  MediaFileDocument,
  IMediaFile,
  IUploadFileDto,
  IFileData,
  getErrorMessage,
} from "@app/shared";
import { StorageService } from "./storage.service";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 минут

  // Ограничения для файлов
  private readonly MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB
  private readonly ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];
  private readonly ALLOWED_AUDIO_TYPES = [
    "audio/mpeg",
    "audio/wav",
    "audio/flac",
  ];

  constructor(
    @InjectModel(MediaFile.name)
    private mediaFileModel: Model<MediaFileDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private storageService: StorageService,
    @Inject("USER_SERVICE") private userClient: ClientProxy,
  ) {}

  /**
   * Загрузка файла (аватарка, трек, обложка)
   */
  async uploadFile(
    uploadDto: IUploadFileDto,
  ): Promise<
    { success: true; file: IMediaFile } | { success: false; error: string }
  > {
    try {
      const { userId, type, file } = uploadDto;

      // Конвертируем Uint8Array обратно в Buffer для работы с файлами
      // После сериализации через RabbitMQ Uint8Array становится plain object
      let fileBuffer: Buffer;
      if (file.buffer instanceof Buffer) {
        fileBuffer = file.buffer;
      } else if (file.buffer instanceof Uint8Array) {
        fileBuffer = Buffer.from(file.buffer);
      } else {
        // Plain object после JSON сериализации - конвертируем в массив, затем в Buffer
        // После JSON сериализации Uint8Array становится объектом с числовыми ключами
        // Используем unknown для обхода строгой типизации после сериализации
        const bufferData = file.buffer as unknown;
        let bufferArray: number[];
        if (Array.isArray(bufferData)) {
          // Если уже массив, приводим к number[]
          bufferArray = bufferData.map((val) => Number(val));
        } else if (bufferData && typeof bufferData === "object") {
          // Если объект, извлекаем значения и приводим к числам
          bufferArray = Object.values(bufferData).map((val) => Number(val));
        } else {
          throw new Error("Invalid buffer format after serialization");
        }
        fileBuffer = Buffer.from(bufferArray);
      }

      // Валидация типа файла
      const validationError = this.validateFile(file, type);
      if (validationError) {
        return { success: false, error: validationError };
      }

      // Генерируем уникальные идентификаторы
      const fileId = uuidv4();
      const fileName = this.storageService.generateFileName(
        file.originalname,
        type,
      );

      // Сохраняем файл на диск (передаем Buffer)
      const filePath = await this.storageService.saveFile(
        {
          ...file,
          buffer: fileBuffer,
        },
        fileName,
        type,
      );

      // Получаем метаданные для изображений
      let metadata: IMediaFile["metadata"] = {};
      if (type === "avatar" && file.mimetype.startsWith("image/")) {
        const imageMetadata =
          await this.storageService.getImageMetadata(fileBuffer);
        metadata = {
          width: imageMetadata.width,
          height: imageMetadata.height,
          format: imageMetadata.format,
        };
      }

      // Генерируем URL
      const url = this.storageService.generateFileUrl(fileId);

      // Сохраняем метаданные в MongoDB
      const mediaFile = new this.mediaFileModel({
        fileId,
        userId,
        type,
        originalName: file.originalname,
        fileName,
        mimeType: file.mimetype,
        size: file.size,
        path: filePath,
        url,
        metadata,
      });

      const savedFile = await mediaFile.save();

      // Если это аватарка, обновляем профиль пользователя
      if (type === "avatar") {
        await this.updateUserAvatar(userId, url);
      }

      // Кэшируем файл
      await this.cacheFile(savedFile);

      const fileData: IMediaFile = {
        fileId: savedFile.fileId,
        userId: savedFile.userId,
        type: savedFile.type as IMediaFile["type"],
        originalName: savedFile.originalName,
        fileName: savedFile.fileName,
        mimeType: savedFile.mimeType,
        size: savedFile.size,
        path: savedFile.path,
        url: savedFile.url,
        metadata: savedFile.metadata,
        createdAt: savedFile.createdAt,
        updatedAt: savedFile.updatedAt,
      };

      return { success: true, file: fileData };
    } catch (error) {
      this.logger.error(`Upload file error: ${error}`);
      return {
        success: false,
        error: getErrorMessage(error, "Failed to upload file"),
      };
    }
  }

  /**
   * Получение файла по ID
   */
  async getFileById(
    fileId: string,
  ): Promise<
    | { success: true; file: MediaFileDocument; buffer: Buffer }
    | { success: false; error: string }
  > {
    try {
      // Проверяем кэш
      const cacheKey = `file:${fileId}`;
      const cachedFile =
        await this.cacheManager.get<MediaFileDocument>(cacheKey);

      let file: MediaFileDocument | null;
      if (cachedFile) {
        file = cachedFile;
        this.logger.log(`[CACHE HIT] File found in cache: ${fileId}`);
      } else {
        file = await this.mediaFileModel.findOne({ fileId });
        if (file) {
          await this.cacheManager.set(cacheKey, file, this.CACHE_TTL);
          this.logger.log(`[CACHE SET] File cached: ${fileId}`);
        }
      }

      if (!file) {
        return { success: false, error: "File not found" };
      }

      // Читаем файл с диска
      const buffer = await this.storageService.readFile(file.path);

      return { success: true, file, buffer };
    } catch (error) {
      this.logger.error(`Get file error: ${error}`);
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get file"),
      };
    }
  }

  /**
   * Получение аватарки пользователя
   */
  async getUserAvatar(
    userId: string,
  ): Promise<
    | { success: true; file: MediaFileDocument; buffer: Buffer }
    | { success: false; error: string }
  > {
    try {
      // Проверяем кэш
      const cacheKey = `avatar:${userId}`;
      const cachedFile =
        await this.cacheManager.get<MediaFileDocument>(cacheKey);

      let file: MediaFileDocument | null;
      if (cachedFile) {
        file = cachedFile;
        this.logger.log(`[CACHE HIT] Avatar found in cache: ${userId}`);
      } else {
        // Ищем последнюю загруженную аватарку пользователя
        file = await this.mediaFileModel
          .findOne({ userId, type: "avatar" })
          .sort({ createdAt: -1 })
          .exec();

        if (file) {
          await this.cacheManager.set(cacheKey, file, this.CACHE_TTL);
          this.logger.log(`[CACHE SET] Avatar cached: ${userId}`);
        }
      }

      if (!file) {
        return { success: false, error: "Avatar not found" };
      }

      // Читаем файл с диска
      const buffer = await this.storageService.readFile(file.path);

      return { success: true, file, buffer };
    } catch (error) {
      this.logger.error(`Get user avatar error: ${error}`);
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get user avatar"),
      };
    }
  }

  /**
   * Удаление файла
   */
  async deleteFile(
    fileId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const file = await this.mediaFileModel.findOne({ fileId });

      if (!file) {
        return { success: false, error: "File not found" };
      }

      // Удаляем файл с диска
      await this.storageService.deleteFile(file.path);

      // Удаляем запись из MongoDB
      await this.mediaFileModel.deleteOne({ fileId });

      // Инвалидируем кэш
      await this.invalidateFileCache(fileId, file.userId, file.type);

      return { success: true };
    } catch (error) {
      this.logger.error(`Delete file error: ${error}`);
      return {
        success: false,
        error: getErrorMessage(error, "Failed to delete file"),
      };
    }
  }

  /**
   * Валидация файла
   */
  private validateFile(
    file: IFileData,
    type: "avatar" | "track" | "cover",
  ): string | null {
    // Валидация размера
    if (type === "avatar" && file.size > this.MAX_AVATAR_SIZE) {
      return `File size exceeds maximum allowed size of ${this.MAX_AVATAR_SIZE / 1024 / 1024}MB`;
    }

    // Валидация типа файла
    if (type === "avatar") {
      if (!this.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        return `Invalid file type. Allowed types: ${this.ALLOWED_IMAGE_TYPES.join(", ")}`;
      }
    } else if (type === "track") {
      if (!this.ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
        return `Invalid file type. Allowed types: ${this.ALLOWED_AUDIO_TYPES.join(", ")}`;
      }
    } else if (type === "cover") {
      if (!this.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        return `Invalid file type. Allowed types: ${this.ALLOWED_IMAGE_TYPES.join(", ")}`;
      }
    }

    return null;
  }

  /**
   * Обновление аватарки пользователя в User Service
   */
  private async updateUserAvatar(
    userId: string,
    avatarUrl: string,
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.userClient.send(
          { cmd: "updateProfile" },
          {
            userId,
            updateDto: { avatarUrl },
          },
        ),
      );
      this.logger.log(`User avatar updated: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to update user avatar: ${error}`);
      // Не прерываем выполнение, если не удалось обновить профиль
    }
  }

  /**
   * Кэширование файла
   */
  private async cacheFile(file: MediaFileDocument): Promise<void> {
    try {
      const fileKey = `file:${file.fileId}`;
      await this.cacheManager.set(fileKey, file, this.CACHE_TTL);

      // Кэшируем аватарку пользователя отдельно
      if (file.type === "avatar") {
        const avatarKey = `avatar:${file.userId}`;
        await this.cacheManager.set(avatarKey, file, this.CACHE_TTL);
      }
    } catch (error) {
      this.logger.error(`Cache file error: ${error}`);
    }
  }

  /**
   * Инвалидация кэша файла
   */
  private async invalidateFileCache(
    fileId: string,
    userId: string,
    type: string,
  ): Promise<void> {
    try {
      const keysToDelete = [`file:${fileId}`];
      if (type === "avatar") {
        keysToDelete.push(`avatar:${userId}`);
      }

      await Promise.all(keysToDelete.map((key) => this.cacheManager.del(key)));
    } catch (error) {
      this.logger.error(`Invalidate cache error: ${error}`);
    }
  }
}
