export interface IMediaFile {
  fileId: string;
  userId: string;
  type: "avatar" | "track" | "cover" | "other";
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  path: string; // Внутренний путь, используется только на сервере
  url: string;
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

/**
 * Публичный интерфейс для ответов API (без внутреннего path)
 * Используется для возврата данных клиенту
 */
export interface IMediaFileResponse {
  fileId: string;
  userId: string;
  type: "avatar" | "track" | "cover" | "other";
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
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

// Тип для файла, который можно передать через RabbitMQ
export interface IFileData {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Uint8Array;
}

export interface IUploadFileDto {
  userId: string;
  type: "avatar" | "track" | "cover";
  file: IFileData;
}

export interface IGetFileDto {
  fileId: string;
}
