import { Injectable, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { ICreateUserDto } from "@app/shared";
import { User } from "@app/shared";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: ICreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: [{ email: createUserDto.email }],
    });

    if (existingUser) {
      if (existingUser.email === createUserDto.email) {
        throw new ConflictException(
          "Пользователь с таким email уже существует",
        );
      }
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds,
    );

    const user = this.usersRepository.create({
      email: createUserDto.email,
      username: createUserDto.username,
      password: hashedPassword,
      role: createUserDto.role || "listener",
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
