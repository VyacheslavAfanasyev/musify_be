import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  // Настройка для правильного определения IP за прокси/nginx
  app.getHttpAdapter().getInstance().set('trust proxy', true);

  await app.listen(3000);
}
void bootstrap();
//
