import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { parseBuffer } from "music-metadata";
import type { IFileData } from "@app/shared";

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || "/app/uploads";
    this.ensureUploadDirectory();
  }

  /**
   * Создает директорию для загрузок, если она не существует
   */
  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      // Создаем поддиректории для разных типов файлов
      await fs.mkdir(path.join(this.uploadDir, "avatars"), { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, "tracks"), { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, "covers"), { recursive: true });
      this.logger.log(`Upload directory ensured: ${this.uploadDir}`);
    } catch (error) {
      this.logger.error(`Failed to create upload directory: ${error}`);
      throw error;
    }
  }

  /**
   * Генерирует уникальное имя файла
   */
  generateFileName(originalName: string, type: string): string {
    const ext = path.extname(originalName);
    const uuid = uuidv4();
    return `${type}_${uuid}${ext}`;
  }

  /**
   * Сохраняет файл на диск
   */
  async saveFile(
    file: IFileData | (Omit<IFileData, "buffer"> & { buffer: Buffer }),
    fileName: string,
    type: "avatar" | "track" | "cover",
  ): Promise<string> {
    try {
      const subDir =
        type === "avatar" ? "avatars" : type === "track" ? "tracks" : "covers";
      const filePath = path.join(this.uploadDir, subDir, fileName);

      // Конвертируем buffer в Buffer, если это Uint8Array или plain object
      let buffer: Buffer;
      if (file.buffer instanceof Buffer) {
        buffer = file.buffer;
      } else if (file.buffer instanceof Uint8Array) {
        buffer = Buffer.from(file.buffer);
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
        buffer = Buffer.from(bufferArray);
      }

      // Для аватарок обрабатываем изображение (оптимизация, ресайз)
      if (type === "avatar" && file.mimetype.startsWith("image/")) {
        await this.processAvatarImage(buffer, filePath);
      } else {
        // Для других типов сохраняем как есть
        await fs.writeFile(filePath, buffer);
      }

      this.logger.log(`File saved: ${filePath}`);
      return filePath;
    } catch (error) {
      this.logger.error(`Failed to save file: ${error}`);
      throw error;
    }
  }

  /**
   * Обработка изображения аватарки (ресайз, оптимизация)
   */
  private async processAvatarImage(
    buffer: Buffer,
    outputPath: string,
  ): Promise<void> {
    try {
      await sharp(buffer)
        .resize(400, 400, {
          fit: "cover",
          position: "center",
        })
        .jpeg({ quality: 85 })
        .toFile(outputPath);
    } catch (error) {
      this.logger.error(`Failed to process avatar image: ${error}`);
      throw error;
    }
  }

  /**
   * Получает метаданные изображения
   */
  async getImageMetadata(buffer: Buffer): Promise<{
    width?: number;
    height?: number;
    format?: string;
  }> {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      };
    } catch (error) {
      this.logger.warn(`Failed to get image metadata: ${error}`);
      return {};
    }
  }

  /**
   * Получает метаданные аудиофайла
   */
  async getAudioMetadata(buffer: Buffer): Promise<{
    duration?: number;
    bitrate?: number;
    format?: string;
  }> {
    try {
      const metadata = await parseBuffer(buffer);
      return {
        duration: metadata.format.duration,
        bitrate: metadata.format.bitrate,
        format: metadata.format.container,
      };
    } catch (error) {
      this.logger.warn(`Failed to get audio metadata: ${error}`);
      return {};
    }
  }

  /**
   * Читает файл с диска
   */
  async readFile(filePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      this.logger.error(`Failed to read file: ${error}`);
      throw error;
    }
  }

  /**
   * Читает часть файла с диска (для range requests)
   */
  async readFileRange(
    filePath: string,
    start: number,
    end: number,
  ): Promise<Buffer> {
    try {
      const fileHandle = await fs.open(filePath, "r");
      const buffer = Buffer.alloc(end - start + 1);
      await fileHandle.read(buffer, 0, end - start + 1, start);
      await fileHandle.close();
      return buffer;
    } catch (error) {
      this.logger.error(`Failed to read file range: ${error}`);
      throw error;
    }
  }

  /**
   * Получает размер файла
   */
  async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      this.logger.error(`Failed to get file size: ${error}`);
      throw error;
    }
  }

  /**
   * Удаляет файл с диска
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      this.logger.log(`File deleted: ${filePath}`);
    } catch (error) {
      // Игнорируем ошибку, если файл не существует
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        this.logger.error(`Failed to delete file: ${error}`);
        throw error;
      }
    }
  }

  /**
   * Генерирует публичный URL для файла
   */
  generateFileUrl(fileId: string): string {
    return `/media/file/${fileId}`;
  }
}
