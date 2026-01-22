import { Controller, Inject } from "@nestjs/common";
import { MessagePattern, EventPattern, Payload } from "@nestjs/microservices";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { MediaService } from "./media.service";
import type { IUploadFileDto, IGetFileDto } from "@app/shared";

@Controller()
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @MessagePattern({ cmd: "getHello" })
  getHello(): string {
    return "Hello World from MEDIA-SERVICE!";
  }

  @MessagePattern({ cmd: "uploadFile" })
  async uploadFile(@Payload() payload: IUploadFileDto) {
    return await this.mediaService.uploadFile(payload);
  }

  @MessagePattern({ cmd: "getFileById" })
  async getFileById(@Payload() payload: IGetFileDto) {
    const result = await this.mediaService.getFileById(payload.fileId);

    // Конвертируем Buffer в Uint8Array для сериализации через RabbitMQ
    if (result.success && "buffer" in result) {
      return {
        ...result,
        buffer: new Uint8Array(result.buffer),
      };
    }

    return result;
  }

  @MessagePattern({ cmd: "getUserAvatar" })
  async getUserAvatar(@Payload() payload: { userId: string }) {
    const result = await this.mediaService.getUserAvatar(payload.userId);

    // Конвертируем Buffer в Uint8Array для сериализации через RabbitMQ
    if (result.success && "buffer" in result) {
      return {
        ...result,
        buffer: new Uint8Array(result.buffer),
      };
    }

    return result;
  }

  @MessagePattern({ cmd: "deleteFile" })
  async deleteFile(@Payload() payload: IGetFileDto) {
    return await this.mediaService.deleteFile(payload.fileId);
  }

  @MessagePattern({ cmd: "getTrackById" })
  async getTrackById(
    @Payload()
    payload: {
      trackId: string;
      range?: { start: number; end: number };
    },
  ) {
    const result = await this.mediaService.getTrackById(
      payload.trackId,
      payload.range,
    );

    // Конвертируем Buffer в Uint8Array для сериализации через RabbitMQ
    if (result.success && "buffer" in result) {
      return {
        ...result,
        buffer: new Uint8Array(result.buffer),
      };
    }

    return result;
  }

  @MessagePattern({ cmd: "getUserTracks" })
  async getUserTracks(@Payload() payload: { userId: string }) {
    return await this.mediaService.getUserTracks(payload.userId);
  }

  @MessagePattern({ cmd: "getTrackCover" })
  async getTrackCover(@Payload() payload: { trackId: string }) {
    const result = await this.mediaService.getTrackCover(payload.trackId);

    // Конвертируем Buffer в Uint8Array для сериализации через RabbitMQ
    if (result.success && "buffer" in result) {
      return {
        ...result,
        buffer: new Uint8Array(result.buffer),
      };
    }

    return result;
  }

  /**
   * Обработка события создания пользователя
   * Добавляет пользователя в кэш для быстрой валидации
   */
  @EventPattern("user.created")
  async handleUserCreated(
    @Payload()
    data: {
      userId: string;
      email: string;
      username: string;
      role?: string;
    },
  ) {
    try {
      // Кэшируем информацию о пользователе для валидации
      const cacheKey = `user:valid:${data.userId}`;
      await this.cacheManager.set(
        cacheKey,
        { userId: data.userId, username: data.username, valid: true },
        24 * 60 * 60 * 1000, // 24 часа
      );
      console.log(
        `[EVENT] user.created handled in Media Service: userId=${data.userId}`,
      );
    } catch (error) {
      console.error(
        `[EVENT] Error handling user.created in Media Service: ${error}`,
      );
    }
  }

  /**
   * Обработка события обновления пользователя
   * Обновляет кэш пользователя
   */
  @EventPattern("user.updated")
  async handleUserUpdated(
    @Payload()
    data: {
      userId: string;
      updateDto: any;
    },
  ) {
    try {
      // Обновляем кэш пользователя
      const cacheKey = `user:valid:${data.userId}`;
      const cached = await this.cacheManager.get<{
        userId: string;
        username: string;
        valid: boolean;
      }>(cacheKey);

      if (cached) {
        await this.cacheManager.set(
          cacheKey,
          {
            ...cached,
            username: data.updateDto.username || cached.username,
          },
          24 * 60 * 60 * 1000, // 24 часа
        );
      }
      console.log(
        `[EVENT] user.updated handled in Media Service: userId=${data.userId}`,
      );
    } catch (error) {
      console.error(
        `[EVENT] Error handling user.updated in Media Service: ${error}`,
      );
    }
  }

  /**
   * Обработка события удаления пользователя
   * Удаляет пользователя из кэша
   */
  @EventPattern("user.deleted")
  async handleUserDeleted(@Payload() data: { userId: string }) {
    try {
      // Удаляем пользователя из кэша
      const cacheKey = `user:valid:${data.userId}`;
      await this.cacheManager.del(cacheKey);
      console.log(
        `[EVENT] user.deleted handled in Media Service: userId=${data.userId}`,
      );
    } catch (error) {
      console.error(
        `[EVENT] Error handling user.deleted in Media Service: ${error}`,
      );
    }
  }
}
