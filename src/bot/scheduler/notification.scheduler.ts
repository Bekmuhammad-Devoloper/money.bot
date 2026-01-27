import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf, Context } from 'telegraf';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { RedisService } from '../../redis';
import {
  User,
  UserStatus,
  Subscription,
  SubscriptionStatus,
  Notification,
  NotificationType,
  NotificationStatus,
} from '../../database/entities';
import { Messages } from '../constants';

@Injectable()
export class NotificationSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  onModuleInit() {
    this.logger.log('Notification scheduler initialized');
  }

  /**
   * Run every day at 9:00 AM to check subscriptions
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleSubscriptionNotifications() {
    this.logger.log('Running subscription notification check...');

    // Acquire lock to prevent duplicate execution
    const lockAcquired = await this.redisService.acquireLock(
      'notification_scheduler',
      300, // 5 minutes
    );

    if (!lockAcquired) {
      this.logger.log('Notification scheduler already running');
      return;
    }

    try {
      // Process different notification types
      await this.sendExpiryWarning1(); // 1 day before (Day 29)
      await this.sendExpiryWarning2(); // Expiry day (Day 30)
      await this.sendFinalWarning();   // 1 day after (Day 31)
      await this.removeExpiredUsers(); // 2 days after (Day 32)
    } catch (error) {
      this.logger.error(`Notification scheduler error: ${error}`);
    } finally {
      await this.redisService.releaseLock('notification_scheduler');
    }
  }

  /**
   * Send expiry warning 1 day before (Day 29)
   */
  private async sendExpiryWarning1() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const expiringSubscriptions = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: Between(tomorrow, dayAfterTomorrow),
      },
      relations: ['user', 'channel'],
    });

    this.logger.log(
      `Found ${expiringSubscriptions.length} subscriptions expiring tomorrow`,
    );

    for (const subscription of expiringSubscriptions) {
      await this.sendNotification(
        subscription,
        NotificationType.EXPIRY_WARNING_1,
        Messages.EXPIRY_WARNING_1.replace(
          '{channel}',
          subscription.channel?.name || 'Unknown',
        ),
      );
    }
  }

  /**
   * Send expiry warning on expiry day (Day 30)
   */
  private async sendExpiryWarning2() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const expiringSubscriptions = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: Between(today, tomorrow),
      },
      relations: ['user', 'channel'],
    });

    this.logger.log(
      `Found ${expiringSubscriptions.length} subscriptions expiring today`,
    );

    for (const subscription of expiringSubscriptions) {
      await this.sendNotification(
        subscription,
        NotificationType.EXPIRY_WARNING_2,
        Messages.EXPIRY_WARNING_2.replace(
          '{channel}',
          subscription.channel?.name || 'Unknown',
        ),
      );
    }
  }

  /**
   * Send final warning 1 day after expiry (Day 31)
   */
  private async sendFinalWarning() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiredSubscriptions = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: Between(yesterday, today),
        userRemoved: false,
      },
      relations: ['user', 'channel'],
    });

    this.logger.log(
      `Found ${expiredSubscriptions.length} subscriptions for final warning`,
    );

    for (const subscription of expiredSubscriptions) {
      await this.sendNotification(
        subscription,
        NotificationType.FINAL_WARNING,
        Messages.FINAL_WARNING.replace(
          '{channel}',
          subscription.channel?.name || 'Unknown',
        ),
      );
    }
  }

  /**
   * Remove users 2 days after expiry (Day 32)
   */
  private async removeExpiredUsers() {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(23, 59, 59, 999);

    const expiredSubscriptions = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: LessThan(twoDaysAgo),
        userRemoved: false,
      },
      relations: ['user', 'channel'],
    });

    this.logger.log(
      `Found ${expiredSubscriptions.length} subscriptions to remove`,
    );

    for (const subscription of expiredSubscriptions) {
      try {
        // Remove user from channel
        if (subscription.channel && subscription.user) {
          try {
            await this.bot.telegram.banChatMember(
              subscription.channel.telegramChannelId,
              subscription.user.telegramId,
            );

            // Immediately unban to allow future subscription
            await this.bot.telegram.unbanChatMember(
              subscription.channel.telegramChannelId,
              subscription.user.telegramId,
            );

            this.logger.log(
              `Removed user ${subscription.user.telegramId} from channel ${subscription.channel.telegramChannelId}`,
            );
          } catch (error) {
            this.logger.warn(
              `Failed to remove user from channel: ${error}`,
            );
          }

          // Send removal notice
          await this.sendNotification(
            subscription,
            NotificationType.REMOVAL_NOTICE,
            Messages.REMOVAL_NOTICE.replace(
              '{channel}',
              subscription.channel?.name || 'Unknown',
            ),
          );
        }

        // Update subscription status
        await this.subscriptionRepository.update(subscription.id, {
          status: SubscriptionStatus.EXPIRED,
          userRemoved: true,
        });

        // Update user status
        await this.userRepository.update(subscription.userId, {
          status: UserStatus.REMOVED,
        });
      } catch (error) {
        this.logger.error(
          `Error removing user ${subscription.userId}: ${error}`,
        );
      }
    }
  }

  /**
   * Send notification to user
   */
  private async sendNotification(
    subscription: Subscription,
    type: NotificationType,
    message: string,
  ): Promise<void> {
    if (!subscription.user) return;

    // Check if notification was already sent today
    const existingNotification = await this.notificationRepository.findOne({
      where: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        type,
        status: NotificationStatus.SENT,
      },
    });

    if (existingNotification) {
      // Check if sent today
      const sentToday =
        existingNotification.sentAt &&
        existingNotification.sentAt.toDateString() === new Date().toDateString();
      if (sentToday) {
        this.logger.log(
          `Notification ${type} already sent to user ${subscription.userId} today`,
        );
        return;
      }
    }

    // Create notification record
    const notification = this.notificationRepository.create({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      type,
      message,
      status: NotificationStatus.PENDING,
    });

    try {
      // Send message
      await this.bot.telegram.sendMessage(
        subscription.user.telegramId,
        message,
        { parse_mode: 'Markdown' },
      );

      // Update notification status
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();

      // Update subscription notification count
      await this.subscriptionRepository.update(subscription.id, {
        notificationsSent: subscription.notificationsSent + 1,
        lastNotificationAt: new Date(),
      });

      this.logger.log(
        `Sent ${type} notification to user ${subscription.user.telegramId}`,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      notification.status = NotificationStatus.FAILED;
      notification.errorMessage = errorMessage;
      notification.retryCount = 1;

      this.logger.warn(
        `Failed to send notification to ${subscription.user.telegramId}: ${errorMessage}`,
      );

      // Check if user blocked the bot
      if (
        errorMessage.includes('blocked') ||
        errorMessage.includes('deactivated')
      ) {
        await this.userRepository.update(
          { telegramId: subscription.user.telegramId },
          { isBlocked: true },
        );
      }
    }

    await this.notificationRepository.save(notification);
  }

  /**
   * Manual trigger for testing (can be called via admin command)
   */
  async runManualCheck(): Promise<void> {
    await this.handleSubscriptionNotifications();
  }
}
