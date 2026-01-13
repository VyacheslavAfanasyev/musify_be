import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from "typeorm";

/**
 * AuthUser - сущность для PostgreSQL
 * Хранит только данные безопасности: email, password, id
 */
@Entity("auth_users")
export class AuthUser {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @CreateDateColumn()
  createdAt: Date;
}
