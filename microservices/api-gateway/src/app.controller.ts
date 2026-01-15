import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AppService } from './app.service';

// Тип для загруженного файла
type UploadedFileType = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};
import type {
  IChangePasswordDto,
  ICreateUserDto,
  ILoginDto,
  IRefreshTokenDto,
  ILogoutDto,
  IUpdateUserProfileDto,
} from '@app/shared';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('auth/hello')
  getAuthHello(): Promise<string> {
    return this.appService.getAuthHello();
  }

  @Post('auth/register')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 запросов в минуту
  register(@Body() registerDto: ICreateUserDto) {
    return this.appService.register(registerDto);
  }

  @Post('auth/login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 запросов в минуту
  login(@Body() loginDto: ILoginDto) {
    return this.appService.login(loginDto);
  }

  @Post('auth/refresh')
  refresh(@Body() refreshTokenDto: IRefreshTokenDto) {
    return this.appService.refresh(refreshTokenDto);
  }

  @Post('auth/logout')
  logout(@Body() logoutDto: ILogoutDto) {
    return this.appService.logout(logoutDto);
  }

  @Post('auth/change_pass')
  changePassword(@Body() changePasswordDto: IChangePasswordDto) {
    return this.appService.changePassword(changePasswordDto);
  }

  @Get('users/hello')
  getUsersHello(): Promise<string> {
    return this.appService.getAuthHello();
  }

  @Get('users/:id/profile')
  getUserProfile(@Param('id') id: string) {
    return this.appService.getUserProfile(id);
  }

  @Get('users/username/:username')
  getUserProfileByUsername(@Param('username') username: string) {
    return this.appService.getUserProfileByUsername(username);
  }

  @Get('users/:username/tracks')
  getUserTracks(@Param('username') username: string) {
    return this.appService.getUserTracks(username);
  }

  @Put('users/:id/profile')
  updateUserProfile(
    @Param('id') id: string,
    @Body() updateDto: IUpdateUserProfileDto,
  ) {
    return this.appService.updateUserProfile(id, updateDto);
  }

  @Post('media/upload/avatar')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 запросов в минуту
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile() file: UploadedFileType | undefined,
    @Body() body: { userId?: string; type?: string },
  ): Promise<{ success: boolean; file?: any; error?: string }> {
    const userId = body?.userId;
    if (!file) {
      return {
        success: false,
        error: 'File is required',
      };
    }

    if (!userId) {
      return {
        success: false,
        error: 'userId is required',
      };
    }

    return await this.appService.uploadAvatar(userId, file);
  }

  @Post('media/upload/track')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 запросов в минуту
  @UseInterceptors(FileInterceptor('file'))
  async uploadTrack(
    @UploadedFile() file: UploadedFileType | undefined,
    @Body() body: { userId?: string; type?: string },
  ): Promise<{ success: boolean; file?: any; error?: string }> {
    const userId = body?.userId;
    if (!file) {
      return {
        success: false,
        error: 'File is required',
      };
    }

    if (!userId) {
      return {
        success: false,
        error: 'userId is required',
      };
    }

    return await this.appService.uploadTrack(userId, file);
  }

  @Post('media/upload/cover')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 запросов в минуту
  @UseInterceptors(FileInterceptor('file'))
  async uploadCover(
    @UploadedFile() file: UploadedFileType | undefined,
    @Body() body: { userId?: string; type?: string },
  ): Promise<{ success: boolean; file?: any; error?: string }> {
    const userId = body?.userId;
    if (!file) {
      return {
        success: false,
        error: 'File is required',
      };
    }

    if (!userId) {
      return {
        success: false,
        error: 'userId is required',
      };
    }

    return await this.appService.uploadCover(userId, file);
  }

  @Get('media/avatar/:userId')
  async getUserAvatar(@Param('userId') userId: string, @Res() res: Response) {
    const result = await this.appService.getUserAvatar(userId);

    if (!result.success || !('buffer' in result)) {
      const errorMessage =
        'error' in result ? result.error : 'Avatar not found';
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        error: errorMessage,
      });
    }

    res.setHeader('Content-Type', result.file.mimeType);
    res.setHeader('Content-Length', String(result.file.size));
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Кэш на 1 час
    return res.send(result.buffer);
  }

  @Get('media/file/:fileId')
  async getFileById(@Param('fileId') fileId: string, @Res() res: Response) {
    const result = await this.appService.getFileById(fileId);

    if (!result.success || !('buffer' in result)) {
      const errorMessage = 'error' in result ? result.error : 'File not found';
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        error: errorMessage,
      });
    }

    res.setHeader('Content-Type', result.file.mimeType);
    res.setHeader('Content-Length', String(result.file.size));
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(result.buffer);
  }

  @Get('media/track/:trackId')
  async getTrack(
    @Param('trackId') trackId: string,
    @Res() res: Response,
  ): Promise<void> {
    // Парсим Range заголовок для поддержки стриминга
    const rangeHeader = res.req.headers.range;
    let range: { start: number; end: number } | undefined;

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : undefined;
      if (!isNaN(start)) {
        range = {
          start,
          end: end && !isNaN(end) ? end : start + 1024 * 1024 - 1, // 1MB chunks
        };
      }
    }

    const result = await this.appService.getTrack(trackId, range);

    if (!result.success || !('buffer' in result)) {
      const errorMessage = 'error' in result ? result.error : 'Track not found';
      res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        error: errorMessage,
      });
      return;
    }

    const { file, buffer, start, end, totalSize } = result;

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Accept-Ranges', 'bytes');

    // Если запрошен range, отправляем частичный контент
    if (start !== undefined && end !== undefined) {
      const contentLength = end - start + 1;
      res.status(HttpStatus.PARTIAL_CONTENT);
      res.setHeader('Content-Length', String(contentLength));
      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(buffer);
    } else {
      // Иначе отправляем весь файл
      res.setHeader('Content-Length', String(totalSize));
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(buffer);
    }
  }

  @Get('media/cover/:trackId')
  async getTrackCover(
    @Param('trackId') trackId: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.appService.getTrackCover(trackId);

    if (!result.success || !('buffer' in result)) {
      const errorMessage = 'error' in result ? result.error : 'Cover not found';
      res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        error: errorMessage,
      });
      return;
    }

    res.setHeader('Content-Type', result.file.mimeType);
    res.setHeader('Content-Length', String(result.file.size));
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Кэш на 1 час
    res.send(result.buffer);
  }

  @Delete('media/file/:fileId')
  async deleteFile(@Param('fileId') fileId: string) {
    return await this.appService.deleteFile(fileId);
  }
}
