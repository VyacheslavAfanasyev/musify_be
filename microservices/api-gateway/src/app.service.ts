import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  firstValueFrom,
  Observable,
  timeout,
  catchError,
  throwError,
} from 'rxjs';
import type {
  IChangePasswordDto,
  ICreateUserDto,
  ILoginDto,
  IRefreshTokenDto,
  ILogoutDto,
  IBaseResponse,
  IRegisterResponse,
  ILoginResponse,
  IRefreshResponse,
  IUpdateUserProfileDto,
} from '@app/shared';

@Injectable()
export class AppService {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
    @Inject('MEDIA_SERVICE') private readonly mediaClient: ClientProxy,
  ) {}

  getHello(): string {
    return 'Hello World from GATEAWAY!';
  }

  private async sendToAuthService<TResponse, TInput = unknown>(
    cmd: string,
    payload: TInput,
  ): Promise<TResponse> {
    const observable = this.authClient.send<TResponse, TInput>(
      { cmd },
      payload,
    ) as unknown as Observable<TResponse>;
    return await firstValueFrom(
      observable.pipe(
        timeout(10000), // 10 секунд таймаут
        catchError((error) => {
          if (error.name === 'TimeoutError') {
            return throwError(() => new Error(`Auth Service timeout: ${cmd}`));
          }
          return throwError(() => error);
        }),
      ),
    );
  }

  private async sendToUserService<TResponse, TInput = unknown>(
    cmd: string,
    payload: TInput,
  ): Promise<TResponse> {
    const observable = this.userClient.send<TResponse, TInput>(
      { cmd },
      payload,
    ) as unknown as Observable<TResponse>;
    return await firstValueFrom(
      observable.pipe(
        timeout(10000), // 10 секунд таймаут
        catchError((error) => {
          if (error.name === 'TimeoutError') {
            return throwError(() => new Error(`User Service timeout: ${cmd}`));
          }
          return throwError(() => error);
        }),
      ),
    );
  }

  private async sendToMediaService<TResponse, TInput = unknown>(
    cmd: string,
    payload: TInput,
  ): Promise<TResponse> {
    const observable = this.mediaClient.send<TResponse, TInput>(
      { cmd },
      payload,
    ) as unknown as Observable<TResponse>;
    return await firstValueFrom(
      observable.pipe(
        timeout(30000), // 30 секунд таймаут для загрузки файлов
        catchError((error) => {
          if (error.name === 'TimeoutError') {
            return throwError(() => new Error(`Media Service timeout: ${cmd}`));
          }
          return throwError(() => error);
        }),
      ),
    );
  }

  /**
   * Конвертирует buffer из различных форматов (Buffer, Uint8Array, plain object)
   * в Buffer для использования после получения через RabbitMQ
   */
  private convertBufferToBuffer(buffer: unknown): Buffer {
    if (buffer instanceof Buffer) {
      return buffer;
    }

    if (buffer instanceof Uint8Array) {
      return Buffer.from(buffer);
    }

    // Plain object после JSON сериализации - конвертируем в массив, затем в Buffer
    let bufferArray: number[];

    if (Array.isArray(buffer)) {
      bufferArray = buffer.map((val) => Number(val));
    } else if (buffer && typeof buffer === 'object') {
      bufferArray = Object.values(buffer).map((val) => Number(val));
    } else {
      throw new Error('Invalid buffer format after serialization');
    }

    return Buffer.from(bufferArray);
  }

  /**
   * Подготавливает файл для передачи через RabbitMQ
   * Конвертирует Express.Multer.File в формат, который можно сериализовать
   */
  private prepareFileForUpload(file: any) {
    return {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      size: file.size,
      buffer: new Uint8Array(file.buffer),
    };
  }

  /**
   * Обрабатывает ошибки и возвращает стандартизированный ответ
   */
  private handleError(error: unknown): { success: false; error: string } {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  async getAuthHello(): Promise<string> {
    return this.sendToAuthService<string, Record<string, never>>(
      'getHello',
      {},
    );
  }

  async register(registerDto: ICreateUserDto): Promise<IRegisterResponse> {
    return this.sendToAuthService<IRegisterResponse, ICreateUserDto>(
      'register',
      registerDto,
    );
  }

  async login(loginDto: ILoginDto): Promise<ILoginResponse> {
    return this.sendToAuthService<ILoginResponse, ILoginDto>('login', loginDto);
  }

  async refresh(refreshTokenDto: IRefreshTokenDto): Promise<IRefreshResponse> {
    return this.sendToAuthService<IRefreshResponse, IRefreshTokenDto>(
      'refresh',
      refreshTokenDto,
    );
  }

  async logout(logoutDto: ILogoutDto): Promise<IBaseResponse> {
    return this.sendToAuthService<IBaseResponse, ILogoutDto>(
      'logout',
      logoutDto,
    );
  }

  async changePassword(
    changePasswordDto: IChangePasswordDto,
  ): Promise<IBaseResponse> {
    return this.sendToAuthService<IBaseResponse, IChangePasswordDto>(
      'changePassword',
      changePasswordDto,
    );
  }

  /**
   * Получение полного профиля пользователя
   * Объединяет данные из Auth Service (базовые данные) и User Service (профиль)
   */
  async getUserProfile(userId: string) {
    try {
      // Получаем базовые данные из Auth Service
      const authResult = await this.sendToAuthService<{
        success: boolean;
        user?: { id: string; email: string };
        error?: string;
      }>('getUserById', { id: userId });

      if (!authResult.success || !authResult.user) {
        return {
          success: false,
          error: authResult.error || 'User not found',
        };
      }

      // Получаем профиль из User Service
      const profileResult = await this.sendToUserService<{
        success: boolean;
        profile?: any;
        error?: string;
      }>('getProfileByUserId', { userId });

      if (!profileResult.success || !profileResult.profile) {
        return {
          success: false,
          error: 'User profile not found',
        };
      }

      // Объединяем данные
      const profile = profileResult.profile.toObject
        ? profileResult.profile.toObject()
        : profileResult.profile;

      return {
        success: true,
        user: {
          id: authResult.user.id,
          email: authResult.user.email,
          ...profile,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Получение профиля по username
   */
  async getUserProfileByUsername(username: string) {
    try {
      const profileResult = await this.sendToUserService<{
        success: boolean;
        profile?: any;
        error?: string;
      }>('getProfileByUsername', { username });

      if (!profileResult.success || !profileResult.profile) {
        return {
          success: false,
          error: profileResult.error || 'Profile not found',
        };
      }

      const profile = profileResult.profile.toObject
        ? profileResult.profile.toObject()
        : profileResult.profile;

      // Получаем email из Auth Service
      const authResult = await this.sendToAuthService<{
        success: boolean;
        user?: { id: string; email: string };
        error?: string;
      }>('getUserById', { id: profile.userId });

      return {
        success: true,
        user: {
          ...profile,
          email:
            authResult.success && authResult.user
              ? authResult.user.email
              : undefined,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Обновление профиля пользователя
   */
  async updateUserProfile(
    userId: string,
    updateDto: IUpdateUserProfileDto,
  ): Promise<IBaseResponse> {
    return this.sendToUserService<
      IBaseResponse,
      {
        userId: string;
        updateDto: IUpdateUserProfileDto;
      }
    >('updateProfile', { userId, updateDto });
  }

  /**
   * Загрузка аватарки пользователя
   */
  async uploadAvatar(userId: string, file: any) {
    try {
      const fileData = this.prepareFileForUpload(file);

      return await this.sendToMediaService<
        { success: true; file: any } | { success: false; error: string },
        { userId: string; type: 'avatar'; file: any }
      >('uploadFile', {
        userId,
        type: 'avatar',
        file: fileData,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Загрузка трека пользователя
   */
  async uploadTrack(userId: string, file: any) {
    try {
      const fileData = this.prepareFileForUpload(file);

      return await this.sendToMediaService<
        { success: true; file: any } | { success: false; error: string },
        { userId: string; type: 'track'; file: any }
      >('uploadFile', {
        userId,
        type: 'track',
        file: fileData,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Получение аватарки пользователя
   */
  async getUserAvatar(userId: string) {
    try {
      const result = await this.sendToMediaService<
        | { success: true; file: any; buffer: Uint8Array | Buffer }
        | { success: false; error: string },
        { userId: string }
      >('getUserAvatar', { userId });

      if (result.success && 'buffer' in result) {
        const buffer = this.convertBufferToBuffer(result.buffer);
        return {
          ...result,
          buffer,
        };
      }

      return result;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Получение файла по ID
   */
  async getFileById(fileId: string) {
    try {
      const result = await this.sendToMediaService<
        | { success: true; file: any; buffer: Uint8Array | Buffer }
        | { success: false; error: string },
        { fileId: string }
      >('getFileById', { fileId });

      if (result.success && 'buffer' in result) {
        const buffer = this.convertBufferToBuffer(result.buffer);
        return {
          ...result,
          buffer,
        };
      }

      return result;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Получение трека по ID с поддержкой range requests
   */
  async getTrack(
    trackId: string,
    range?: { start: number; end: number },
  ): Promise<
    | {
        success: true;
        file: any;
        buffer: Buffer;
        start?: number;
        end?: number;
        totalSize: number;
      }
    | { success: false; error: string }
  > {
    try {
      const result = await this.sendToMediaService<
        | {
            success: true;
            file: any;
            buffer: Uint8Array | Buffer;
            start?: number;
            end?: number;
            totalSize: number;
          }
        | { success: false; error: string },
        { trackId: string; range?: { start: number; end: number } }
      >('getTrackById', { trackId, range });

      if (result.success && 'buffer' in result) {
        const buffer = this.convertBufferToBuffer(result.buffer);
        return {
          success: true,
          file: result.file,
          buffer,
          start: result.start,
          end: result.end,
          totalSize: result.totalSize,
        };
      }

      return {
        success: false,
        error: 'error' in result ? result.error : 'Unknown error',
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Получение треков пользователя по username
   */
  async getUserTracks(username: string) {
    try {
      // Сначала получаем userId по username
      const profileResult = await this.sendToUserService<{
        success: boolean;
        profile?: any;
        error?: string;
      }>('getProfileByUsername', { username });

      if (!profileResult.success || !profileResult.profile) {
        return {
          success: false,
          error: profileResult.error || 'User not found',
        };
      }

      const userId = profileResult.profile.userId || profileResult.profile._id;

      // Получаем треки пользователя
      return await this.sendToMediaService<
        { success: true; tracks: any[] } | { success: false; error: string },
        { userId: string }
      >('getUserTracks', { userId });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Удаление файла
   */
  async deleteFile(fileId: string) {
    try {
      return await this.sendToMediaService<
        { success: boolean; error?: string },
        { fileId: string }
      >('deleteFile', { fileId });
    } catch (error) {
      return this.handleError(error);
    }
  }
}
