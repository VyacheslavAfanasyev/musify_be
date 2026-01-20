// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ExecutionContext, Injectable } from '@nestjs/common'; // без ExecutionContext ratte limiting не работает
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected getTracker(req: Request): Promise<string> {
    // Получаем IP адрес из заголовков, если приложение работает за прокси
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded
      ? Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(',')[0].trim()
      : req.ip || req.socket.remoteAddress;

    return Promise.resolve(ip || 'unknown');
  }
}
