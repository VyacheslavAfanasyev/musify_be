import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initializeTracing } from '@app/shared';

const sdk = initializeTracing('api-gateway');
sdk.start();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  // Настройка для правильного определения IP за прокси/nginx
  app.getHttpAdapter().getInstance().set('trust proxy', true);

  await app.listen(3000);
  console.log('API Gateway is listening on port 3000');
}

// Обработка завершения приложения
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

void bootstrap();
