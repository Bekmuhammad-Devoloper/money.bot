import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum BroadcastStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum BroadcastType {
  TEXT = 'text',
  PHOTO = 'photo',
  VIDEO = 'video',
  DOCUMENT = 'document',
}

@Entity('broadcasts')
export class Broadcast {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  adminId: number;

  @Column({
    type: 'enum',
    enum: BroadcastType,
    default: BroadcastType.TEXT,
  })
  type: BroadcastType;

  @Column({ type: 'text', nullable: true })
  text: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  mediaFileId: string | null;

  @Column({ type: 'text', nullable: true })
  caption: string | null;

  @Column({
    type: 'enum',
    enum: BroadcastStatus,
    default: BroadcastStatus.PENDING,
  })
  status: BroadcastStatus;

  @Column({ type: 'int', default: 0 })
  totalUsers: number;

  @Column({ type: 'int', default: 0 })
  sentCount: number;

  @Column({ type: 'int', default: 0 })
  failedCount: number;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
