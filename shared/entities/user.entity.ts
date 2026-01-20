import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({
    type: "enum",
    enum: ["musician", "listener", "admin"],
    default: "listener",
  })
  role: "musician" | "listener" | "admin";

  @CreateDateColumn()
  createdAt: Date;
}
