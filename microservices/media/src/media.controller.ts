import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { MediaService } from "./media.service";
import type { IUploadFileDto, IGetFileDto } from "@app/shared";

@Controller()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

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
}
