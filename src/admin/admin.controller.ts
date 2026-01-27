import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UnauthorizedException,
  HttpCode,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminService } from './admin.service';
import * as crypto from 'crypto';

@Controller('api/admin')
export class AdminController {
  private readonly botToken: string;
  private readonly adminApiToken: string;
  private readonly isDev: boolean;

  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) {
    this.botToken = this.configService.get<string>('telegram.botToken') || '';
    this.adminApiToken = this.configService.get<string>('ADMIN_API_TOKEN') || 'puloqimi_admin_secret_token_2024';
    this.isDev = this.configService.get<string>('NODE_ENV') !== 'production';
  }

  /**
   * Verify Telegram Web App auth data
   */
  private verifyTelegramAuth(initData: string): { userId: number; isValid: boolean } {
    try {
      const params = new URLSearchParams(initData);
      const hash = params.get('hash');
      params.delete('hash');

      // Sort params
      const sortedParams = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      // Create secret key
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(this.botToken)
        .digest();

      // Calculate hash
      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(sortedParams)
        .digest('hex');

      if (calculatedHash !== hash) {
        return { userId: 0, isValid: false };
      }

      // Parse user data
      const userStr = params.get('user');
      if (!userStr) {
        return { userId: 0, isValid: false };
      }

      const user = JSON.parse(userStr);
      return { userId: user.id, isValid: true };
    } catch (error) {
      return { userId: 0, isValid: false };
    }
  }

  /**
   * Auth guard helper - supports Telegram WebApp auth and Bearer token for dev
   */
  private authenticate(initData: string, authHeader?: string): number {
    // Check Bearer token first (for dev/testing)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token === this.adminApiToken) {
        // Return first admin ID for token auth
        return this.adminService.getFirstAdminId();
      }
    }

    // Try Telegram WebApp auth
    if (initData) {
      const { userId, isValid } = this.verifyTelegramAuth(initData);
      if (isValid && this.adminService.isAdmin(userId)) {
        return userId;
      }
    }

    // Dev mode: allow without auth
    if (this.isDev && !initData && !authHeader) {
      console.log('[AdminController] Dev mode: bypassing auth');
      return this.adminService.getFirstAdminId();
    }

    throw new UnauthorizedException('Access denied');
  }

  /**
   * Get dashboard statistics
   */
  @Get('stats')
  async getStats(
    @Headers('x-telegram-init-data') initData: string,
    @Headers('authorization') authHeader: string,
  ) {
    this.authenticate(initData, authHeader);
    return await this.adminService.getStatistics();
  }

  /**
   * Get all users
   */
  @Get('users')
  async getUsers(
    @Headers('x-telegram-init-data') initData: string,
    @Headers('authorization') authHeader: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
  ) {
    this.authenticate(initData, authHeader);
    return await this.adminService.getUsers(
      parseInt(page),
      parseInt(limit),
      search,
    );
  }

  /**
   * Get subscribers
   */
  @Get('subscribers')
  async getSubscribers(
    @Headers('x-telegram-init-data') initData: string,
    @Headers('authorization') authHeader: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    this.authenticate(initData, authHeader);
    return await this.adminService.getSubscribers(parseInt(page), parseInt(limit));
  }

  /**
   * Get interested users
   */
  @Get('interested')
  async getInterestedUsers(
    @Headers('x-telegram-init-data') initData: string,
    @Headers('authorization') authHeader: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    this.authenticate(initData, authHeader);
    return await this.adminService.getInterestedUsers(parseInt(page), parseInt(limit));
  }

  /**
   * Get all channels
   */
  @Get('channels')
  async getChannels(
    @Headers('x-telegram-init-data') initData: string,
    @Headers('authorization') authHeader: string,
  ) {
    this.authenticate(initData, authHeader);
    return await this.adminService.getChannels();
  }

  /**
   * Create new channel
   */
  @Post('channels')
  async createChannel(
    @Headers('x-telegram-init-data') initData: string,
    @Headers('authorization') authHeader: string,
    @Body() body: {
      name: string;
      description?: string;
      telegramChannelId: number;
      telegramChannelUsername?: string;
    },
  ) {
    this.authenticate(initData, authHeader);
    return await this.adminService.createChannel(body);
  }

  /**
   * Update channel
   */
  @Put('channels/:id')
  async updateChannel(
    @Headers('x-telegram-init-data') initData: string,
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      telegramChannelUsername?: string;
      isActive?: boolean;
    },
  ) {
    this.authenticate(initData, authHeader);
    return await this.adminService.updateChannel(id, body);
  }

  /**
   * Delete channel
   */
  @Delete('channels/:id')
  async deleteChannel(
    @Headers('x-telegram-init-data') initData: string,
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    this.authenticate(initData, authHeader);
    return await this.adminService.deleteChannel(id);
  }

  /**
   * Toggle channel status
   */
  @Post('channels/:id/toggle')
  @HttpCode(200)
  async toggleChannel(
    @Headers('x-telegram-init-data') initData: string,
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    this.authenticate(initData, authHeader);
    return await this.adminService.toggleChannel(id);
  }

  // ==================== PLAN ENDPOINTS ====================

  /**
   * Get plans for a channel
   */
  @Get('channels/:channelId/plans')
  async getPlans(
    @Headers('x-telegram-init-data') initData: string,
    @Headers('authorization') authHeader: string,
    @Param('channelId') channelId: string,
  ) {
    this.authenticate(initData, authHeader);
    return await this.adminService.getPlans(channelId);
  }

  /**
   * Create new plan
   */
  @Post('plans')
  async createPlan(
    @Headers('x-telegram-init-data') initData: string,
    @Headers('authorization') authHeader: string,
    @Body() body: {
      channelId: string;
      name: string;
      description?: string;
      duration: string;
      durationDays: number;
      price: number;
      originalPrice?: number;
      discountPercent?: number;
    },
  ) {
    this.authenticate(initData, authHeader);
    return await this.adminService.createPlan(body as any);
  }

  /**
   * Update plan
   */
  @Put('plans/:id')
  async updatePlan(
    @Headers('x-telegram-init-data') initData: string,
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      price?: number;
      originalPrice?: number;
      discountPercent?: number;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    this.authenticate(initData, authHeader);
    return await this.adminService.updatePlan(id, body);
  }

  /**
   * Delete plan
   */
  @Delete('plans/:id')
  async deletePlan(
    @Headers('x-telegram-init-data') initData: string,
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    this.authenticate(initData, authHeader);
    return await this.adminService.deletePlan(id);
  }

  /**
   * Toggle plan status
   */
  @Post('plans/:id/toggle')
  @HttpCode(200)
  async togglePlan(
    @Headers('x-telegram-init-data') initData: string,
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    this.authenticate(initData, authHeader);
    return await this.adminService.togglePlan(id);
  }

  // ==================== BROADCAST ENDPOINTS ====================

  /**
   * Send broadcast
   */
  @Post('broadcast')
  async sendBroadcast(
    @Headers('x-telegram-init-data') initData: string,
    @Headers('authorization') authHeader: string,
    @Body() body: {
      message: string;
      mediaType?: 'photo' | 'video';
      mediaFileId?: string;
      targetType: 'all' | 'subscribers' | 'interested';
    },
  ) {
    this.authenticate(initData, authHeader);
    return await this.adminService.sendBroadcast(body);
  }

  /**
   * Get broadcast history
   */
  @Get('broadcasts')
  async getBroadcasts(
    @Headers('x-telegram-init-data') initData: string,
    @Headers('authorization') authHeader: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    this.authenticate(initData, authHeader);
    return await this.adminService.getBroadcastHistory(parseInt(page), parseInt(limit));
  }
}
