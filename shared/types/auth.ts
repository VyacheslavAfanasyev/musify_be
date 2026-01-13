export interface ICreateUserDto {
  email: string;
  username: string;
  password: string;
  role?: "musician" | "listener";
}

export interface ILoginDto {
  email: string;
  password: string;
}

export interface IRefreshTokenDto {
  refreshToken: string;
}

export interface IChangePasswordDto {
  userId: string;
  oldPassword: string;
  newPassword: string;
}

export interface ILogoutDto {
  refreshToken: string;
}
