export type UserRole = "musician" | "listener" | "admin";

export interface IUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  createdAt: Date;
}
