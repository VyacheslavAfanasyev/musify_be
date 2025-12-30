import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { UsersService } from "./users.service";
import type { IChangePasswordDto, ICreateUserDto } from "@app/shared";

@Controller()
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern({ cmd: "getHello" })
  getHello(): string {
    return "Hello World from USER-SERVICE!";
  }

  @MessagePattern({ cmd: "createUser" })
  async createUser(@Payload() createUserDto: ICreateUserDto) {
    return await this.usersService.create(createUserDto);
  }

  @MessagePattern({ cmd: "getUserByEmail" })
  async getUserByEmail(@Payload() payload: { email: string }) {
    return await this.usersService.findByEmail(payload.email);
  }

  @MessagePattern({ cmd: "getUserById" })
  async getUserById(@Payload() payload: { id: string }) {
    return await this.usersService.findById(payload.id);
  }

  @MessagePattern({ cmd: "getAllUsers" })
  async getAllUsers() {
    return await this.usersService.findAll();
  }

  @MessagePattern({ cmd: "updatePassword" })
  async updatePassword(
    @Payload()
    payload: IChangePasswordDto,
  ) {
    return await this.usersService.updatePassword(
      payload.userId,
      payload.oldPassword,
      payload.newPassword,
    );
  }
}
