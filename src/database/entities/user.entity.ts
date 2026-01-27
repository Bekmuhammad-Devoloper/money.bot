import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Subscription } from './subscription.entity';
import { Payment } from './payment.entity';
import { Notification } from './notification.entity';

export enum UserStatus {
  REGISTERED = 'registered',      // Just registered, no subscription
  ACTIVE = 'active',              // Has active subscription
  EXPIRED = 'expired',            // Subscription expired
  REMOVED = 'removed',            // Removed from channel
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'bigint', unique: true })
  telegramId: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  username: string | null;

  @Column({ type: 'varchar', length: 255 })
  fullName: string;

  @Column({ type: 'varchar', length: 20 })
  phoneNumber: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.REGISTERED,
  })
  status: UserStatus;

  @Column({ type: 'boolean', default: false })
  isBlocked: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Subscription, (subscription) => subscription.user)
  subscriptions: Subscription[];

  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Payment[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
}
