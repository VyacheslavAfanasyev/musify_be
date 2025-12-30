export interface IUser {
  id: string;
  email: string;
  username: string;
  role: "musician" | "listener" | "admin";
  createdAt: Date;
}

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
