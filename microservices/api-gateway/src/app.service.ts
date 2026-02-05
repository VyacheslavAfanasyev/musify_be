import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
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
import { CircuitBreakerService } from './circuit-breaker.service';

@Injectable()
export class AppService {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
    @Inject('MEDIA_SERVICE') private readonly mediaClient: ClientProxy,
    @Inject('SOCIAL_SERVICE') private readonly socialClient: ClientProxy,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  getHello(): string {
    return 'Hello World from GATEAWAY!';
  }

  /**
   * Отправляет запрос к Auth Service через Circuit Breaker
   */
  private async sendToAuthService<TResponse, TInput = unknown>(
    cmd: string,
    payload: TInput,
    fallback?: () => Promise<TResponse> | TResponse,
  ): Promise<TResponse> {
    return this.circuitBreakerService.executeWithCircuitBreaker(
      'AUTH_SERVICE',
      this.authClient,
      cmd,
      payload,
      {
        timeout: 10000, // 10 секунд таймаут
        errorThresholdPercentage: 50, // 50% ошибок
        resetTimeout: 30000, // 30 секунд до попытки восстановления
      },
      fallback,
    );
  }

  /**
   * Отправляет запрос к User Service через Circuit Breaker
   */
  private async sendToUserService<TResponse, TInput = unknown>(
    cmd: string,
    payload: TInput,
    fallback?: () => Promise<TResponse> | TResponse,
  ): Promise<TResponse> {
    return this.circuitBreakerService.executeWithCircuitBreaker(
      'USER_SERVICE',
      this.userClient,
      cmd,
      payload,
      {
        timeout: 10000, // 10 секунд таймаут
        errorThresholdPercentage: 50, // 50% ошибок
        resetTimeout: 30000, // 30 секунд до попытки восстановления
      },
      fallback,
    );
  }

  /**
   * Отправляет запрос к Media Service через Circuit Breaker
   */
  private async sendToMediaService<TResponse, TInput = unknown>(
    cmd: string,
    payload: TInput,
    fallback?: () => Promise<TResponse> | TResponse,
  ): Promise<TResponse> {
    return this.circuitBreakerService.executeWithCircuitBreaker(
      'MEDIA_SERVICE',
      this.mediaClient,
      cmd,
      payload,
      {
        timeout: 30000, // 30 секунд таймаут для загрузки файлов
        errorThresholdPercentage: 50, // 50% ошибок
        resetTimeout: 30000, // 30 секунд до попытки восстановления
      },
      fallback,
    );
  }

  /**
   * Отправляет запрос к Social Service через Circuit Breaker
   */
  private async sendToSocialService<TResponse, TInput = unknown>(
    cmd: string,
    payload: TInput,
    fallback?: () => Promise<TResponse> | TResponse,
  ): Promise<TResponse> {
    return this.circuitBreakerService.executeWithCircuitBreaker(
      'SOCIAL_SERVICE',
      this.socialClient,
      cmd,
      payload,
      {
        timeout: 10000, // 10 секунд таймаут
        errorThresholdPercentage: 50, // 50% ошибок
        resetTimeout: 30000, // 30 секунд до попытки восстановления
      },
      fallback,
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
   * Декодирует имя файла из правильной кодировки
   * Исправляет проблему с кириллицей в именах файлов
   * Универсальное решение для любых кириллических имен файлов
   *
   * Проблема: когда UTF-8 текст интерпретируется как Latin-1, возникает mojibake
   * Решение: декодируем из Latin-1 в UTF-8 и проверяем наличие кириллицы
   */
  private decodeFileName(originalName: string): string {
    try {
      // Проверяем, есть ли уже кириллица в оригинальном имени
      // Если есть - имя уже правильно закодировано, возвращаем как есть
      const hasCyrillic = /[А-Яа-яЁё]/.test(originalName);
      if (hasCyrillic) {
        return originalName;
      }

      // Проверяем, содержит ли имя файла URL-encoded символы
      // Например, %D0%9F вместо П
      if (originalName.includes('%')) {
        try {
          const urlDecoded = decodeURIComponent(originalName);
          if (urlDecoded !== originalName && /[А-Яа-яЁё]/.test(urlDecoded)) {
            return urlDecoded;
          }
        } catch (_e) {
          // Если декодирование не удалось, продолжаем
        }
      }

      // Пытаемся декодировать из Latin-1 в UTF-8
      // Это исправляет случай, когда UTF-8 был неправильно интерпретирован как Latin-1
      // Когда UTF-8 байты интерпретируются как Latin-1, каждый байт становится символом
      // Преобразуем строку обратно в байты Latin-1, а затем интерпретируем как UTF-8
      const buffer = Buffer.from(originalName, 'latin1');
      const decoded = buffer.toString('utf8');

      // Проверяем, появились ли кириллические символы после декодирования
      // Если да - значит это был mojibake, используем декодированное имя
      if (decoded && decoded !== originalName && /[А-Яа-яЁё]/.test(decoded)) {
        return decoded;
      }

      // Если декодирование не дало результата или имя уже правильно закодировано
      // возвращаем оригинальное имя
      return originalName;
    } catch (_error) {
      // В случае ошибки возвращаем оригинальное имя
      return originalName;
    }
  }

  /**
   * Подготавливает файл для передачи через RabbitMQ
   * Конвертирует Express.Multer.File в формат, который можно сериализовать
   */
  private prepareFileForUpload(file: any) {
    return {
      fieldname: file.fieldname,
      originalname: this.decodeFileName(file.originalname),
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
      () =>
        ({
          success: false,
          error:
            'Auth Service is temporarily unavailable. Please try again later.',
        }) as IRegisterResponse,
    );
  }

  async login(loginDto: ILoginDto): Promise<ILoginResponse> {
    return this.sendToAuthService<ILoginResponse, ILoginDto>(
      'login',
      loginDto,
      () =>
        ({
          success: false,
          error:
            'Auth Service is temporarily unavailable. Please try again later.',
        }) as ILoginResponse,
    );
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
   * Перенаправляет запрос в User Service, который сам агрегирует данные
   */
  async getUserProfile(userId: string) {
    try {
      return await this.sendToUserService<
        { success: true; user: any } | { success: false; error: string },
        { userId: string }
      >('getUserProfile', { userId }, () => ({
        success: false,
        error:
          'User Service is temporarily unavailable. Please try again later.',
      }));
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Получение профиля по username
   * Перенаправляет запрос в User Service, который сам агрегирует данные
   */
  async getUserProfileByUsername(username: string) {
    try {
      return await this.sendToUserService<
        { success: true; user: any } | { success: false; error: string },
        { username: string }
      >('getUserProfileByUsername', { username }, () => ({
        success: false,
        error:
          'User Service is temporarily unavailable. Please try again later.',
      }));
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
   * Загрузка обложки трека
   */
  async uploadCover(userId: string, file: any) {
    try {
      const fileData = this.prepareFileForUpload(file);

      return await this.sendToMediaService<
        { success: true; file: any } | { success: false; error: string },
        { userId: string; type: 'cover'; file: any }
      >('uploadFile', {
        userId,
        type: 'cover',
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
   * Получение всех аудиофайлов пользователя по username
   */
  async getUserAudioFiles(username: string) {
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

      // Получаем все аудиофайлы пользователя
      return await this.sendToMediaService<
        | { success: true; audioFiles: any[] }
        | { success: false; error: string },
        { userId: string }
      >('getUserAudioFiles', { userId });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Получение обложки трека по ID трека
   */
  async getTrackCover(trackId: string) {
    try {
      const result = await this.sendToMediaService<
        | { success: true; file: any; buffer: Uint8Array | Buffer }
        | { success: false; error: string },
        { trackId: string }
      >('getTrackCover', { trackId });

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

  /**
   * Удаление трека (аудио файла)
   */
  async deleteTrack(trackId: string) {
    try {
      return await this.sendToMediaService<
        { success: boolean; error?: string },
        { fileId: string }
      >('deleteFile', { fileId: trackId });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Подписка на пользователя
   */
  async followUser(followerId: string, followingId: string) {
    try {
      return await this.sendToSocialService<
        IBaseResponse,
        { followerId: string; followingId: string }
      >('followUser', { followerId, followingId });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Отписка от пользователя
   */
  async unfollowUser(followerId: string, followingId: string) {
    try {
      return await this.sendToSocialService<
        IBaseResponse,
        { followerId: string; followingId: string }
      >('unfollowUser', { followerId, followingId });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Получить список подписчиков пользователя
   */
  async getFollowers(userId: string) {
    try {
      return await this.sendToSocialService<
        | { success: true; followers: string[] }
        | { success: false; error: string },
        { userId: string }
      >('getFollowers', { userId });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Получить список подписок пользователя
   */
  async getFollowing(userId: string) {
    try {
      return await this.sendToSocialService<
        | { success: true; following: string[] }
        | { success: false; error: string },
        { userId: string }
      >('getFollowing', { userId });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Проверить, подписан ли пользователь на другого пользователя
   */
  async isFollowing(followerId: string, followingId: string) {
    try {
      return await this.sendToSocialService<
        | { success: true; isFollowing: boolean }
        | { success: false; error: string },
        { followerId: string; followingId: string }
      >('checkFollowStatus', { followerId, followingId });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Получить публичную страницу пользователя
   */
  async getPublicProfile(username: string, viewerId?: string) {
    try {
      return await this.sendToSocialService<
        { success: true; profile: any } | { success: false; error: string },
        { username: string; viewerId?: string }
      >('getPublicProfile', { username, viewerId }, () => ({
        success: false,
        error:
          'Social Service is temporarily unavailable. Please try again later.',
      }));
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Получить ленту обновлений пользователя
   */
  async getUserFeed(userId: string) {
    try {
      return await this.sendToSocialService<
        { success: true; feed: any[] } | { success: false; error: string },
        { userId: string }
      >('getUserFeed', { userId }, () => ({
        success: false,
        error:
          'Social Service is temporarily unavailable. Please try again later.',
      }));
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Получить список всех пользователей
   * @param excludeUserId - ID пользователя, которого нужно исключить из списка
   */
  async getAllUsers(excludeUserId?: string) {
    try {
      return await this.sendToUserService<
        { success: true; profiles: any[] } | { success: false; error: string },
        { excludeUserId?: string }
      >('getAllUsers', { excludeUserId }, () => ({
        success: false,
        error:
          'User Service is temporarily unavailable. Please try again later.',
      }));
    } catch (error) {
      return this.handleError(error);
    }
  }
}
