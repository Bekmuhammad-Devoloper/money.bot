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

export enum PaymentStatus {
  PENDING = 'pending',            // Payment initiated
  PROCESSING = 'processing',      // Payment in progress
  COMPLETED = 'completed',        // Payment successful
  CANCELLED = 'cancelled',        // Payment cancelled
  FAILED = 'failed',              // Payment failed
  REFUNDED = 'refunded',          // Payment refunded
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  subscriptionId: string | null;

  @Column({ type: 'uuid', nullable: true })
  channelId: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  orderId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymeTransactionId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paymeTransactionTime: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  performTime: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  cancelTime: Date | null;

  @Column({ type: 'int', nullable: true })
  cancelReason: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  paymentUrl: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
