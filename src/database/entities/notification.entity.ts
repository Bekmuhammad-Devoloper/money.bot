import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum NotificationType {
  EXPIRY_WARNING_1 = 'expiry_warning_1',    // Day 29 - 1 day before
  EXPIRY_WARNING_2 = 'expiry_warning_2',    // Day 30 - expiry day
  FINAL_WARNING = 'final_warning',           // Day 31 - final warning
  REMOVAL_NOTICE = 'removal_notice',         // Day 32 - removed
  WELCOME = 'welcome',                       // Welcome message
  PAYMENT_SUCCESS = 'payment_success',       // Payment confirmation
  BROADCAST = 'broadcast',                   // Admin broadcast
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity('notifications')
@Index(['userId', 'type', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  subscriptionId: string | null;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.notifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
