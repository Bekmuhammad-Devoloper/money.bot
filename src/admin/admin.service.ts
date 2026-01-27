import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User, Channel, Plan, PlanDuration, Subscription, Payment, Broadcast, SubscriptionStatus, PaymentStatus, BroadcastStatus, BroadcastType } from '../database/entities';
import { Telegraf } from 'telegraf';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly bot: Telegraf;
  private readonly adminIds: number[];

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Channel) private readonly channelRepo: Repository<Channel>,
    @InjectRepository(Plan) private readonly planRepo: Repository<Plan>,
    @InjectRepository(Subscription) private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Broadcast) private readonly broadcastRepo: Repository<Broadcast>,
  ) {
    const botToken = this.configService.get<string>('telegram.botToken');
    this.bot = new Telegraf(botToken || '');
    this.adminIds = this.configService.get<number[]>('telegram.adminIds') || [];
  }

  /**
   * Verify admin access
   */
  isAdmin(telegramId: number): boolean {
    return this.adminIds.includes(telegramId);
  }

  /**
   * Get first admin ID (for token-based auth)
   */
  getFirstAdminId(): number {
    return this.adminIds[0] || 0;
  }

  /**
   * Get dashboard statistics
   */
  async getStatistics() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      todayUsers,
      activeSubscriptions,
      totalChannels,
      todayPayments,
      monthlyRevenue,
    ] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { createdAt: MoreThan(today) } }),
      this.subscriptionRepo.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.channelRepo.count({ where: { isActive: true } }),
      this.paymentRepo.count({ where: { createdAt: MoreThan(today), status: PaymentStatus.COMPLETED } }),
      this.paymentRepo
        .createQueryBuilder('payment')
        .select('COALESCE(SUM(payment.amount), 0)', 'total')
        .where('payment.createdAt >= :date', { date: thisMonth })
        .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
        .getRawOne(),
    ]);

    return {
      totalUsers,
      todayUsers,
      activeSubscriptions,
      totalChannels,
      todayPayments,
      monthlyRevenue: parseFloat(monthlyRevenue?.total || '0'),
    };
  }

  /**
   * Get all users with pagination
   */
  async getUsers(page: number = 1, limit: number = 20, search?: string) {
    const skip = (page - 1) * limit;

    const query = this.userRepo.createQueryBuilder('user')
      .leftJoinAndSelect('user.subscriptions', 'subscription', 'subscription.status = :status', { status: SubscriptionStatus.ACTIVE })
      .orderBy('user.createdAt', 'DESC');

    if (search) {
      query.where('user.fullName ILIKE :search OR user.username ILIKE :search OR CAST(user.telegramId AS TEXT) LIKE :search', {
        search: `%${search}%`,
      });
    }

    const [users, total] = await query.skip(skip).take(limit).getManyAndCount();

    return {
      users: users.map(user => ({
        id: user.id,
        telegramId: user.telegramId,
        fullName: user.fullName,
        username: user.username,
        phoneNumber: user.phoneNumber,
        status: user.status,
        hasActiveSubscription: user.subscriptions?.length > 0,
        createdAt: user.createdAt,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get subscribers (users with active subscriptions)
   */
  async getSubscribers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [subscriptions, total] = await this.subscriptionRepo.findAndCount({
      where: { status: SubscriptionStatus.ACTIVE },
      relations: ['user', 'channel'],
      order: { startDate: 'DESC' },
      skip,
      take: limit,
    });

    return {
      subscribers: subscriptions.map(sub => ({
        id: sub.id,
        user: {
          id: sub.user?.id,
          telegramId: sub.user?.telegramId,
          fullName: sub.user?.fullName,
          username: sub.user?.username,
        },
        channel: {
          id: sub.channel?.id,
          name: sub.channel?.name,
        },
        startDate: sub.startDate,
        endDate: sub.endDate,
        status: sub.status,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get interested users (registered but no active subscription)
   */
  async getInterestedUsers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    // Get user IDs with active subscriptions
    const activeUserIds = await this.subscriptionRepo
      .createQueryBuilder('sub')
      .select('DISTINCT sub.userId', 'userId')
      .where('sub.status = :status', { status: SubscriptionStatus.ACTIVE })
      .getRawMany();

    const activeIds = activeUserIds.map(u => u.userId);

    // Get users without active subscriptions
    let query = this.userRepo.createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC');

    if (activeIds.length > 0) {
      query = query.where('user.id NOT IN (:...ids)', { ids: activeIds });
    }

    const [users, total] = await query.skip(skip).take(limit).getManyAndCount();

    return {
      users: users.map(user => ({
        id: user.id,
        telegramId: user.telegramId,
        fullName: user.fullName,
        username: user.username,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all channels with plans
   */
  async getChannels() {
    const channels = await this.channelRepo.find({
      relations: ['plans'],
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });

    // Get subscriber count for each channel
    const channelsWithStats = await Promise.all(
      channels.map(async (channel) => {
        const subscriberCount = await this.subscriptionRepo.count({
          where: { channelId: channel.id, status: SubscriptionStatus.ACTIVE },
        });
        
        // Sort plans by sortOrder
        const sortedPlans = channel.plans?.sort((a, b) => a.sortOrder - b.sortOrder) || [];
        
        return {
          ...channel,
          plans: sortedPlans,
          subscriberCount,
        };
      })
    );

    return channelsWithStats;
  }

  /**
   * Create new channel
   */
  async createChannel(data: {
    name: string;
    description?: string;
    telegramChannelId: number;
    telegramChannelUsername?: string;
  }) {
    const channel = this.channelRepo.create({
      ...data,
      isActive: true,
      sortOrder: 0,
    });
    return await this.channelRepo.save(channel);
  }

  /**
   * Update channel
   */
  async updateChannel(id: string, data: {
    name?: string;
    description?: string;
    telegramChannelUsername?: string;
    isActive?: boolean;
  }) {
    await this.channelRepo.update({ id }, data as any);
    return await this.channelRepo.findOne({ where: { id }, relations: ['plans'] });
  }

  /**
   * Delete channel
   */
  async deleteChannel(id: string) {
    await this.channelRepo.delete({ id });
    return { success: true };
  }

  /**
   * Toggle channel status
   */
  async toggleChannel(id: string) {
    const channel = await this.channelRepo.findOne({ where: { id } });
    if (!channel) throw new Error('Channel not found');
    
    channel.isActive = !channel.isActive;
    return await this.channelRepo.save(channel);
  }

  // ==================== PLAN MANAGEMENT ====================

  /**
   * Get all plans for a channel
   */
  async getPlans(channelId: string) {
    return await this.planRepo.find({
      where: { channelId },
      order: { sortOrder: 'ASC', durationDays: 'ASC' },
    });
  }

  /**
   * Create new plan
   */
  async createPlan(data: {
    channelId: string;
    name: string;
    description?: string;
    duration: PlanDuration;
    durationDays: number;
    price: number;
    originalPrice?: number;
    discountPercent?: number;
  }) {
    const plan = this.planRepo.create({
      ...data,
      isActive: true,
      sortOrder: 0,
    });
    return await this.planRepo.save(plan);
  }

  /**
   * Update plan
   */
  async updatePlan(id: string, data: {
    name?: string;
    description?: string;
    price?: number;
    originalPrice?: number;
    discountPercent?: number;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    await this.planRepo.update({ id }, data as any);
    return await this.planRepo.findOne({ where: { id } });
  }

  /**
   * Delete plan
   */
  async deletePlan(id: string) {
    await this.planRepo.delete({ id });
    return { success: true };
  }

  /**
   * Toggle plan status
   */
  async togglePlan(id: string) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new Error('Plan not found');
    
    plan.isActive = !plan.isActive;
    return await this.planRepo.save(plan);
  }

  /**
   * Send broadcast message
   */
  async sendBroadcast(data: {
    message: string;
    mediaType?: 'photo' | 'video';
    mediaFileId?: string;
    targetType: 'all' | 'subscribers' | 'interested';
  }) {
    // Get target users
    let users: User[];

    if (data.targetType === 'subscribers') {
      const activeSubs = await this.subscriptionRepo.find({
        where: { status: SubscriptionStatus.ACTIVE },
        relations: ['user'],
      });
      users = activeSubs.map(sub => sub.user).filter(Boolean) as User[];
    } else if (data.targetType === 'interested') {
      const result = await this.getInterestedUsers(1, 10000);
      users = await this.userRepo.findByIds(result.users.map(u => u.id));
    } else {
      users = await this.userRepo.find();
    }

    // Create broadcast record
    const broadcast = this.broadcastRepo.create({
      adminId: 0, // Will be set by controller
      type: data.mediaType === 'photo' ? BroadcastType.PHOTO : 
            data.mediaType === 'video' ? BroadcastType.VIDEO : BroadcastType.TEXT,
      text: data.message,
      mediaFileId: data.mediaFileId || null,
      totalUsers: users.length,
      status: BroadcastStatus.IN_PROGRESS,
    });
    await this.broadcastRepo.save(broadcast);

    // Send messages
    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        if (data.mediaType === 'photo' && data.mediaFileId) {
          await this.bot.telegram.sendPhoto(user.telegramId.toString(), data.mediaFileId, {
            caption: data.message,
          });
        } else if (data.mediaType === 'video' && data.mediaFileId) {
          await this.bot.telegram.sendVideo(user.telegramId.toString(), data.mediaFileId, {
            caption: data.message,
          });
        } else {
          await this.bot.telegram.sendMessage(user.telegramId.toString(), data.message);
        }
        sent++;
      } catch (error) {
        failed++;
        this.logger.warn(`Failed to send to ${user.telegramId}`);
      }

      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Update broadcast record
    broadcast.sentCount = sent;
    broadcast.failedCount = failed;
    broadcast.status = BroadcastStatus.COMPLETED;
    broadcast.completedAt = new Date();
    await this.broadcastRepo.save(broadcast);

    return {
      success: true,
      sent,
      failed,
      total: users.length,
    };
  }

  /**
   * Get broadcast history
   */
  async getBroadcastHistory(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [broadcasts, total] = await this.broadcastRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      broadcasts,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }
}
