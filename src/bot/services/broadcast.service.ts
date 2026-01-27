import { Injectable, Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf, Context } from 'telegraf';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '../../redis';
import { UserService } from './user.service';
import { Broadcast, BroadcastStatus, BroadcastType } from '../../database/entities';

export interface BroadcastProgress {
  total: number;
  sent: number;
  failed: number;
}

export interface BroadcastData {
  type: 'text' | 'photo' | 'video';
  content?: string;
  fileId?: string;
  caption?: string;
  userCount?: number;
}

@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);
  private activeBroadcasts: Map<string, boolean> = new Map();

  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    @InjectRepository(Broadcast)
    private readonly broadcastRepository: Repository<Broadcast>,
    private readonly redisService: RedisService,
    private readonly userService: UserService,
  ) {}

  /**
   * Start a broadcast to all users
   */
  async startBroadcast(
    adminId: number,
    data: BroadcastData,
    onProgress: (progress: BroadcastProgress) => Promise<void>,
    onComplete: (result: BroadcastProgress) => Promise<void>,
  ): Promise<string> {
    const broadcastId = uuidv4();
    this.activeBroadcasts.set(broadcastId, true);

    // Create broadcast record
    const broadcast = this.broadcastRepository.create({
      id: broadcastId,
      adminId,
      type: this.getBroadcastType(data.type),
      text: data.content || null,
      mediaFileId: data.fileId || null,
      caption: data.caption || null,
      status: BroadcastStatus.IN_PROGRESS,
      totalUsers: data.userCount || 0,
      startedAt: new Date(),
    });
    await this.broadcastRepository.save(broadcast);

    // Start broadcast in background
    this.executeBroadcast(
      broadcastId,
      data,
      onProgress,
      onComplete,
    ).catch((error) => {
      this.logger.error(`Broadcast ${broadcastId} failed: ${error}`);
    });

    return broadcastId;
  }

  /**
   * Execute the broadcast
   */
  private async executeBroadcast(
    broadcastId: string,
    data: BroadcastData,
    onProgress: (progress: BroadcastProgress) => Promise<void>,
    onComplete: (result: BroadcastProgress) => Promise<void>,
  ): Promise<void> {
    const users = await this.userService.getAllUsers();
    const total = users.length;
    let sent = 0;
    let failed = 0;
    const batchSize = 25; // Telegram rate limit
    const delayBetweenBatches = 1000; // 1 second

    this.logger.log(`Starting broadcast ${broadcastId} to ${total} users`);

    // Update broadcast record
    await this.broadcastRepository.update(broadcastId, {
      totalUsers: total,
    });

    // Process users in batches
    for (let i = 0; i < users.length; i += batchSize) {
      // Check if broadcast was cancelled
      if (!this.activeBroadcasts.get(broadcastId)) {
        this.logger.log(`Broadcast ${broadcastId} was cancelled`);
        break;
      }

      const batch = users.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (user) => {
          try {
            await this.sendBroadcastMessage(user.telegramId, data);
            sent++;
          } catch (error: unknown) {
            failed++;
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.warn(
              `Failed to send to ${user.telegramId}: ${errorMessage}`,
            );

            // Check if user blocked the bot
            if (
              errorMessage.includes('blocked') ||
              errorMessage.includes('deactivated')
            ) {
              await this.userService.blockUser(user.telegramId);
            }
          }
        }),
      );

      // Update progress in Redis
      await this.redisService.setBroadcastProgress(
        broadcastId,
        sent,
        failed,
        total,
      );

      // Report progress every 100 messages
      if ((i + batchSize) % 100 === 0 || i + batchSize >= users.length) {
        try {
          await onProgress({ total, sent, failed });
        } catch (error) {
          // Ignore progress callback errors
        }
      }

      // Delay between batches to respect rate limits
      if (i + batchSize < users.length) {
        await this.delay(delayBetweenBatches);
      }
    }

    // Update broadcast record
    await this.broadcastRepository.update(broadcastId, {
      status: BroadcastStatus.COMPLETED,
      sentCount: sent,
      failedCount: failed,
      completedAt: new Date(),
    });

    // Cleanup
    this.activeBroadcasts.delete(broadcastId);

    this.logger.log(
      `Broadcast ${broadcastId} completed: ${sent} sent, ${failed} failed`,
    );

    // Notify completion
    try {
      await onComplete({ total, sent, failed });
    } catch (error) {
      // Ignore completion callback errors
    }
  }

  /**
   * Send broadcast message to a user
   */
  private async sendBroadcastMessage(
    telegramId: number,
    data: BroadcastData,
  ): Promise<void> {
    switch (data.type) {
      case 'text':
        await this.bot.telegram.sendMessage(telegramId, data.content || '', {
          parse_mode: 'HTML',
        });
        break;
      case 'photo':
        await this.bot.telegram.sendPhoto(telegramId, data.fileId || '', {
          caption: data.caption,
          parse_mode: 'HTML',
        });
        break;
      case 'video':
        await this.bot.telegram.sendVideo(telegramId, data.fileId || '', {
          caption: data.caption,
          parse_mode: 'HTML',
        });
        break;
    }
  }

  /**
   * Cancel an active broadcast
   */
  cancelBroadcast(broadcastId: string): boolean {
    if (this.activeBroadcasts.has(broadcastId)) {
      this.activeBroadcasts.set(broadcastId, false);
      return true;
    }
    return false;
  }

  /**
   * Get broadcast progress
   */
  async getBroadcastProgress(
    broadcastId: string,
  ): Promise<BroadcastProgress | null> {
    return this.redisService.getBroadcastProgress(broadcastId);
  }

  /**
   * Get broadcast type enum
   */
  private getBroadcastType(type: string): BroadcastType {
    switch (type) {
      case 'photo':
        return BroadcastType.PHOTO;
      case 'video':
        return BroadcastType.VIDEO;
      default:
        return BroadcastType.TEXT;
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
