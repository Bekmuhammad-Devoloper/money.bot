import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between, IsNull, Not } from 'typeorm';
import {
  User,
  UserStatus,
  Channel,
  Subscription,
  SubscriptionStatus,
  Payment,
  PaymentStatus,
} from '../../database/entities';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  /**
   * Find user by Telegram ID
   */
  async findByTelegramId(telegramId: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { telegramId },
    });
  }

  /**
   * Check if user is registered
   */
  async isRegistered(telegramId: number): Promise<boolean> {
    const user = await this.findByTelegramId(telegramId);
    return !!user;
  }

  /**
   * Register new user
   */
  async register(
    telegramId: number,
    username: string | null,
    fullName: string,
    phoneNumber: string,
  ): Promise<User> {
    const user = this.userRepository.create({
      telegramId,
      username,
      fullName,
      phoneNumber,
      status: UserStatus.REGISTERED,
    });

    return this.userRepository.save(user);
  }

  /**
   * Update user info
   */
  async updateUser(
    telegramId: number,
    data: Partial<Pick<User, 'username' | 'fullName' | 'phoneNumber' | 'status' | 'isBlocked'>>,
  ): Promise<void> {
    await this.userRepository.update({ telegramId }, data);
  }

  /**
   * Get all active channels
   */
  async getActiveChannels(): Promise<Channel[]> {
    return this.channelRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Get channel by ID
   */
  async getChannelById(channelId: string): Promise<Channel | null> {
    return this.channelRepository.findOne({
      where: { id: channelId },
    });
  }

  /**
   * Get user subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      relations: ['channel'],
      order: { endDate: 'ASC' },
    });
  }

  /**
   * Get subscription by user and channel
   */
  async getSubscription(
    userId: string,
    channelId: string,
  ): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { userId, channelId },
      relations: ['channel'],
    });
  }

  /**
   * Create or update subscription (called after payment)
   */
  async activateSubscription(
    userId: string,
    channelId: string,
    inviteLink: string,
  ): Promise<Subscription> {
    const channel = await this.channelRepository.findOne({
      where: { id: channelId },
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    let subscription = await this.subscriptionRepository.findOne({
      where: { userId, channelId },
    });

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + channel.durationDays);

    if (subscription) {
      // Extend existing subscription
      if (subscription.endDate && subscription.endDate > now) {
        subscription.endDate.setDate(
          subscription.endDate.getDate() + channel.durationDays,
        );
      } else {
        subscription.startDate = now;
        subscription.endDate = endDate;
      }
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.inviteLink = inviteLink;
      subscription.inviteLinkUsed = false;
    } else {
      subscription = this.subscriptionRepository.create({
        userId,
        channelId,
        startDate: now,
        endDate,
        status: SubscriptionStatus.ACTIVE,
        inviteLink,
      });
    }

    // Update user status
    await this.userRepository.update(userId, { status: UserStatus.ACTIVE });

    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Mark invite link as used
   */
  async markInviteLinkUsed(subscriptionId: string): Promise<void> {
    await this.subscriptionRepository.update(subscriptionId, {
      inviteLinkUsed: true,
      userJoined: true,
    });
  }

  /**
   * Get pending payment for user and channel
   */
  async getPendingPayment(
    userId: string,
    channelId: string,
  ): Promise<Payment | null> {
    return this.paymentRepository.findOne({
      where: {
        userId,
        channelId,
        status: PaymentStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({
      where: { id: paymentId },
    });
  }

  /**
   * Get total users count
   */
  async getTotalUsersCount(): Promise<number> {
    return this.userRepository.count();
  }

  /**
   * Get active subscriptions count
   */
  async getActiveSubscriptionsCount(): Promise<number> {
    return this.subscriptionRepository.count({
      where: { status: SubscriptionStatus.ACTIVE },
    });
  }

  /**
   * Get subscriptions expiring on specific date
   */
  async getSubscriptionsExpiringOn(date: Date): Promise<Subscription[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: Between(startOfDay, endOfDay),
      },
      relations: ['user', 'channel'],
    });
  }

  /**
   * Get expired subscriptions that need removal
   */
  async getExpiredSubscriptionsForRemoval(): Promise<Subscription[]> {
    const removalDate = new Date();
    removalDate.setDate(removalDate.getDate() - 2); // 2 days after expiry

    return this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: LessThan(removalDate),
        userRemoved: false,
      },
      relations: ['user', 'channel'],
    });
  }

  /**
   * Mark user as removed from channel
   */
  async markUserRemoved(subscriptionId: string): Promise<void> {
    await this.subscriptionRepository.update(subscriptionId, {
      userRemoved: true,
      status: SubscriptionStatus.EXPIRED,
    });
  }

  /**
   * Get subscribed users with details
   */
  async getSubscribedUsers(): Promise<
    Array<{
      user: User;
      subscription: Subscription;
      channel: Channel;
    }>
  > {
    const subscriptions = await this.subscriptionRepository.find({
      where: { status: SubscriptionStatus.ACTIVE },
      relations: ['user', 'channel'],
    });

    return subscriptions.map((sub) => ({
      user: sub.user,
      subscription: sub,
      channel: sub.channel,
    }));
  }

  /**
   * Get interested users (registered but no subscription)
   */
  async getInterestedUsers(): Promise<User[]> {
    const usersWithSubscriptions = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select('DISTINCT subscription.userId')
      .getRawMany();

    const subscribedUserIds = usersWithSubscriptions.map((u) => u.userId);

    if (subscribedUserIds.length === 0) {
      return this.userRepository.find();
    }

    return this.userRepository
      .createQueryBuilder('user')
      .where('user.id NOT IN (:...ids)', { ids: subscribedUserIds })
      .getMany();
  }

  /**
   * Get all users for broadcast
   */
  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find({
      where: { isBlocked: false },
    });
  }

  /**
   * Block user (they blocked the bot)
   */
  async blockUser(telegramId: number): Promise<void> {
    await this.userRepository.update({ telegramId }, { isBlocked: true });
  }

  /**
   * Unblock user
   */
  async unblockUser(telegramId: number): Promise<void> {
    await this.userRepository.update({ telegramId }, { isBlocked: false });
  }

  /**
   * Get today's revenue
   */
  async getTodayRevenue(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.performTime >= :today', { today })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  /**
   * Get monthly revenue
   */
  async getMonthlyRevenue(): Promise<number> {
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const result = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.performTime >= :firstDay', { firstDay: firstDayOfMonth })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  /**
   * Get expiring today count
   */
  async getExpiringTodayCount(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.subscriptionRepository.count({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: Between(today, tomorrow),
      },
    });
  }
}
