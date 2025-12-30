import { Controller } from "@nestjs/common";
import {
  MessagePattern,
  EventPattern,
  Payload,
} from "@nestjs/microservices";
import { UsersService } from "./users.service";
import type {
  ICreateUserProfileDto,
  IUpdateUserProfileDto,
} from "@app/shared";

@Controller()
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern({ cmd: "getHello" })
  getHello(): string {
    return "Hello World from USER-SERVICE!";
  }

  /**
   * Обработка события создания пользователя (Saga Pattern)
   */
  @EventPattern("user.created")
  async handleUserCreated(@Payload() data: ICreateUserProfileDto) {
    console.log("Received user.created event:", data);
    const result = await this.usersService.createProfile(data);
    if (!result.success) {
      console.error("Failed to create profile:", result.error);
      // Можно отправить событие отката, но это уже обработается в Auth Service
    }
  }

  /**
   * Обработка события отката создания пользователя
   */
  @EventPattern("user.create.failed")
  async handleUserCreateFailed(@Payload() data: { userId: string }) {
    console.log("Received user.create.failed event:", data);
    await this.usersService.deleteProfile(data.userId);
  }

  @MessagePattern({ cmd: "getProfileByUserId" })
  async getProfileByUserId(@Payload() payload: { userId: string }) {
    return await this.usersService.getProfileByUserId(payload.userId);
  }

  @MessagePattern({ cmd: "getProfileByUsername" })
  async getProfileByUsername(@Payload() payload: { username: string }) {
    return await this.usersService.getProfileByUsername(payload.username);
  }

  @MessagePattern({ cmd: "checkProfileExists" })
  async checkProfileExists(@Payload() payload: { userId: string }) {
    const exists = await this.usersService.checkProfileExists(payload.userId);
    return { success: true, exists };
  }

  @MessagePattern({ cmd: "updateProfile" })
  async updateProfile(
    @Payload()
    payload: { userId: string; updateDto: IUpdateUserProfileDto },
  ) {
    return await this.usersService.updateProfile(
      payload.userId,
      payload.updateDto,
    );
  }

  @MessagePattern({ cmd: "getAllProfiles" })
  async getAllProfiles() {
    return await this.usersService.findAll();
  }

  // Обратная совместимость (старые методы, которые больше не используются)
  @MessagePattern({ cmd: "createUser" })
  async createUser(@Payload() createUserDto: any) {
    return {
      success: false,
      error: "Use user.created event instead",
    };
  }

  @MessagePattern({ cmd: "getUserByEmail" })
  async getUserByEmail(@Payload() payload: { email: string }) {
    return {
      success: false,
      error: "User data is now in Auth Service",
    };
  }

  @MessagePattern({ cmd: "getUserById" })
  async getUserById(@Payload() payload: { id: string }) {
    return await this.usersService.getProfileByUserId(payload.id);
  }

  @MessagePattern({ cmd: "getAllUsers" })
  async getAllUsers() {
    return await this.usersService.findAll();
  }

  @MessagePattern({ cmd: "updatePassword" })
  async updatePassword(@Payload() payload: any) {
    return {
      success: false,
      error: "Password update is now in Auth Service",
    };
  }
}
