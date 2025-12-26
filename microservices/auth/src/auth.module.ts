import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from './users/users.module';
import { User } from './entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url:
        process.env.DATABASE_URL ||
        'postgresql://musician:secret@localhost:5432/music_app',
      entities: [User],
      synchronize: process.env.NODE_ENV !== 'production', // В продакшене использовать миграции
      logging: process.env.NODE_ENV === 'development',
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
