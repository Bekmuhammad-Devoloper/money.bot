import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Channel } from './channel.entity';
import { Plan } from './plan.entity';

export enum SubscriptionStatus {
  PENDING = 'pending',            // Waiting for payment
  ACTIVE = 'active',              // Active subscription
  EXPIRING_SOON = 'expiring_soon', // 1-3 days before expiry
  EXPIRED = 'expired',            // Subscription expired
  CANCELLED = 'cancelled',        // Cancelled by admin or user
}

@Entity('subscriptions')
@Index(['userId', 'channelId'])
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  channelId: string;

  @Column({ type: 'uuid', nullable: true })
  planId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date | null;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.PENDING,
  })
  status: SubscriptionStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  paidAmount: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  inviteLink: string | null;

  @Column({ type: 'boolean', default: false })
  inviteLinkUsed: boolean;

  @Column({ type: 'boolean', default: false })
  userJoined: boolean;

  @Column({ type: 'boolean', default: false })
  userRemoved: boolean;

  @Column({ type: 'int', default: 0 })
  notificationsSent: number;

  @Column({ type: 'timestamp', nullable: true })
  lastNotificationAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.subscriptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Channel, (channel) => channel.subscriptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channelId' })
  channel: Channel;

  @ManyToOne(() => Plan, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'planId' })
  plan: Plan | null;
}
