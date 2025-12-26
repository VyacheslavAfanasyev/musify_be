import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { ICreateUserDto } from '@app/shared/types';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: ICreateUserDto): Promise<User> {
    // Проверяем, существует ли пользователь с таким email или username
    const existingUser = await this.usersRepository.findOne({
      where: [
        { email: createUserDto.email },
        { username: createUserDto.username },
      ],
    });

    if (existingUser) {
      if (existingUser.email === createUserDto.email) {
        throw new ConflictException(
          'Пользователь с таким email уже существует',
        );
      }
      if (existingUser.username === createUserDto.username) {
        throw new ConflictException(
          'Пользователь с таким username уже существует',
        );
      }
    }

    // Хешируем пароль
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds,
    );

    const user = this.usersRepository.create({
      email: createUserDto.email,
      username: createUserDto.username,
      password: hashedPassword,
      role: createUserDto.role || 'listener',
    });

    return await this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { id } });
  }

  async findAll(): Promise<User[]> {
    return await this.usersRepository.find();
  }
}
