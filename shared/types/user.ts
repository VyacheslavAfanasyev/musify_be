export interface IUser {
  id: string;
  email: string;
  username: string;
  role: "musician" | "listener" | "admin";
  createdAt: Date;
}
