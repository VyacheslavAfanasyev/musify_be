import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AuthService } from "./auth.service";
import type {
  ICreateUserDto,
  ILoginDto,
  IRefreshTokenDto,
  IChangePasswordDto,
} from "@app/shared";

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern({ cmd: "getHello" })
  getHello(): string {
    return this.authService.getHello();
  }

  @MessagePattern({ cmd: "register" })
  async register(@Payload() createUserDto: ICreateUserDto) {
    return await this.authService.register(createUserDto);
  }

  @MessagePattern({ cmd: "login" })
  async login(@Payload() loginDto: ILoginDto) {
    return await this.authService.login(loginDto);
  }

  @MessagePattern({ cmd: "refresh" })
  async refresh(@Payload() refreshTokenDto: IRefreshTokenDto) {
    return await this.authService.refreshTokens(refreshTokenDto);
  }

  @MessagePattern({ cmd: "changePassword" })
  async changePassword(@Payload() changePasswordDto: IChangePasswordDto) {
    return await this.authService.changePassword(changePasswordDto);
  }

  @MessagePattern({ cmd: "getUserById" })
  async getUserById(@Payload() payload: { id: string }) {
    return await this.authService.getUserById(payload.id);
  }
}
