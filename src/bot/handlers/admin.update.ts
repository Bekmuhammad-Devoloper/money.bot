import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot, Update, Ctx, Hears, Action, On } from 'nestjs-telegraf';
import { Telegraf, Context, Markup } from 'telegraf';
import { Message } from 'telegraf/typings/core/types/typegram';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Channel, Subscription, SubscriptionStatus } from '../../database/entities';

interface BotContext extends Context {}

@Update()
@Injectable()
export class AdminUpdateHandler implements OnModuleInit {
  private readonly logger = new Logger(AdminUpdateHandler.name);
  private readonly adminIds: number[];
  
  // Temporary storage for admin states
  private adminStates: Map<number, { state: string; data?: any }> = new Map();

  constructor(
    @InjectBot() private readonly bot: Telegraf<BotContext>,
    private readonly configService: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Channel) private readonly channelRepo: Repository<Channel>,
    @InjectRepository(Subscription) private readonly subscriptionRepo: Repository<Subscription>,
  ) {
    this.adminIds = this.configService.get<number[]>('telegram.adminIds') || [];
    this.logger.log(`Admin IDs loaded: ${this.adminIds.join(', ')}`);
  }

  /**
   * Register /admin command directly on bot instance
   */
  onModuleInit() {
    this.bot.command('admin', async (ctx) => {
      const telegramId = ctx.from?.id;
      this.logger.log(`/admin command from user ${telegramId}`);

      if (!telegramId) {
        await ctx.reply('❌ Foydalanuvchi aniqlanmadi');
        return;
      }

      if (!this.isAdmin(telegramId)) {
        this.logger.log(`User ${telegramId} is NOT admin`);
        await ctx.reply(`❌ Siz admin emassiz.\n\nSizning ID: ${telegramId}`);
        return;
      }

      await this.showAdminMenu(ctx);
    });
    
    this.logger.log('Admin /admin command registered');
  }

  private isAdmin(telegramId: number): boolean {
    return this.adminIds.includes(telegramId);
  }

  /**
   * Show main admin menu
   */
  private async showAdminMenu(ctx: BotContext) {
    const webAppUrl = process.env.WEB_APP_URL || 'https://your-domain.com/admin.html';
    
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.webApp('🌐 Web Admin Panel', webAppUrl)],
      [Markup.button.callback('📊 Statistika', 'admin_stats')],
      [Markup.button.callback('👥 Obunadorlar', 'admin_subscribers')],
      [Markup.button.callback('🔍 Qiziquvchilar', 'admin_interested')],
      [Markup.button.callback('📺 Kanallar', 'admin_channels')],
      [Markup.button.callback('📢 Post jo\'natish', 'admin_broadcast')],
    ]);

    const message = `🔐 *Admin Panel*\n\nXush kelibsiz! Quyidagi bo'limlardan birini tanlang:`;

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
      await ctx.answerCbQuery();
    } else {
      await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
    }
  }

  /**
   * Statistics
   */
  @Action('admin_stats')
  async onStats(@Ctx() ctx: BotContext) {
    if (!ctx.from?.id || !this.isAdmin(ctx.from.id)) return;

    try {
      const totalUsers = await this.userRepo.count();
      const activeSubscribers = await this.subscriptionRepo.count({ where: { status: SubscriptionStatus.ACTIVE } });
      const totalChannels = await this.channelRepo.count({ where: { isActive: true } });

      const message = `📊 *Statistika*\n\n` +
        `👤 Jami foydalanuvchilar: ${totalUsers}\n` +
        `✅ Faol obunalar: ${activeSubscribers}\n` +
        `📺 Faol kanallar: ${totalChannels}`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'admin_back')]]),
      });
      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error(`Stats error: ${error}`);
      await ctx.answerCbQuery('Xatolik yuz berdi');
    }
  }

  /**
   * Subscribers list
   */
  @Action('admin_subscribers')
  async onSubscribers(@Ctx() ctx: BotContext) {
    if (!ctx.from?.id || !this.isAdmin(ctx.from.id)) return;

    try {
      const activeSubscriptions = await this.subscriptionRepo.find({
        where: { status: SubscriptionStatus.ACTIVE },
        relations: ['user', 'channel'],
        take: 20,
      });

      let message = `👥 *Faol Obunadorlar*\n\n`;

      if (activeSubscriptions.length === 0) {
        message += 'Hozircha faol obunalar yo\'q.';
      } else {
        for (const sub of activeSubscriptions) {
          const user = sub.user;
          const channel = sub.channel;
          const endDate = sub.endDate ? new Date(sub.endDate).toLocaleDateString('uz-UZ') : 'N/A';
          message += `• ${user?.fullName || 'Noma\'lum'} (@${user?.username || 'yo\'q'}) - ${channel?.name || 'Kanal'} - ${endDate}\n`;
        }
        message += `\n_Jami: ${activeSubscriptions.length} ta_`;
      }

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'admin_back')]]),
      });
      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error(`Subscribers error: ${error}`);
      await ctx.answerCbQuery('Xatolik yuz berdi');
    }
  }

  /**
   * Interested users (registered but no active subscription)
   */
  @Action('admin_interested')
  async onInterested(@Ctx() ctx: BotContext) {
    if (!ctx.from?.id || !this.isAdmin(ctx.from.id)) return;

    try {
      // Get all users
      const allUsers = await this.userRepo.find({ take: 50 });
      
      // Get users with active subscriptions
      const activeSubUserIds = await this.subscriptionRepo
        .createQueryBuilder('sub')
        .select('DISTINCT sub.userId', 'userId')
        .where('sub.status = :status', { status: SubscriptionStatus.ACTIVE })
        .getRawMany();
      
      const activeUserIds = new Set(activeSubUserIds.map(u => u.userId));
      
      // Filter users without active subscriptions
      const interestedUsers = allUsers.filter(user => !activeUserIds.has(user.id));

      let message = `🔍 *Qiziquvchilar (obunasiz)*\n\n`;

      if (interestedUsers.length === 0) {
        message += 'Hozircha bunday foydalanuvchilar yo\'q.';
      } else {
        for (const user of interestedUsers.slice(0, 20)) {
          message += `• ${user.fullName || 'Noma\'lum'} (@${user.username || 'yo\'q'}) - ID: ${user.telegramId}\n`;
        }
        message += `\n_Jami: ${interestedUsers.length} ta_`;
      }

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'admin_back')]]),
      });
      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error(`Interested error: ${error}`);
      await ctx.answerCbQuery('Xatolik yuz berdi');
    }
  }

  /**
   * Channels management
   */
  @Action('admin_channels')
  async onChannels(@Ctx() ctx: BotContext) {
    if (!ctx.from?.id || !this.isAdmin(ctx.from.id)) return;

    try {
      const channels = await this.channelRepo.find();

      let message = `📺 *Kanallar Boshqaruvi*\n\n`;

      const buttons: any[] = [];

      if (channels.length === 0) {
        message += 'Hozircha kanallar yo\'q.\n';
      } else {
        for (const channel of channels) {
          const status = channel.isActive ? '✅' : '❌';
          message += `${status} *${channel.name}*\n`;
          message += `   🆔 ID: \`${channel.telegramChannelId}\`\n\n`;
          
          buttons.push([Markup.button.callback(`✏️ ${channel.name}`, `edit_channel_${channel.id}`)]);
        }
      }

      buttons.push([Markup.button.callback('➕ Yangi kanal qo\'shish', 'add_channel')]);
      buttons.push([Markup.button.callback('⬅️ Orqaga', 'admin_back')]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons),
      });
      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error(`Channels error: ${error}`);
      await ctx.answerCbQuery('Xatolik yuz berdi');
    }
  }

  /**
   * Add channel - start
   */
  @Action('add_channel')
  async onAddChannel(@Ctx() ctx: BotContext) {
    if (!ctx.from?.id || !this.isAdmin(ctx.from.id)) return;

    this.adminStates.set(ctx.from.id, { state: 'adding_channel_name' });

    await ctx.editMessageText(
      `➕ *Yangi kanal qo'shish*\n\nKanal nomini kiriting:`,
      { parse_mode: 'Markdown' }
    );
    await ctx.answerCbQuery();
  }

  /**
   * Edit channel
   */
  @Action(/^edit_channel_(.+)$/)
  async onEditChannel(@Ctx() ctx: BotContext) {
    if (!ctx.from?.id || !this.isAdmin(ctx.from.id)) return;

    const callbackData = (ctx.callbackQuery as any)?.data || '';
    const match = callbackData.match(/^edit_channel_(.+)$/);
    const channelId = match?.[1];

    if (!channelId) return;

    try {
      const channel = await this.channelRepo.findOne({ where: { id: channelId } });
      if (!channel) {
        await ctx.answerCbQuery('Kanal topilmadi');
        return;
      }

      const status = channel.isActive ? '✅ Faol' : '❌ Nofaol';
      const message = `✏️ *Kanalni tahrirlash*\n\n` +
        `📺 Nomi: ${channel.name}\n` +
        `🆔 ID: \`${channel.telegramChannelId}\`\n` +
        `� Holati: ${status}\n\n` +
        `� Tariflarni Web App orqali boshqaring`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('✏️ Nomini o\'zgartirish', `ch_name_${channelId}`)],
          [Markup.button.callback(channel.isActive ? '❌ O\'chirish' : '✅ Yoqish', `ch_toggle_${channelId}`)],
          [Markup.button.callback('🗑 O\'chirish', `ch_delete_${channelId}`)],
          [Markup.button.callback('⬅️ Orqaga', 'admin_channels')],
        ]),
      });
      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error(`Edit channel error: ${error}`);
      await ctx.answerCbQuery('Xatolik yuz berdi');
    }
  }

  /**
   * Toggle channel status
   */
  @Action(/^ch_toggle_(.+)$/)
  async onToggleChannel(@Ctx() ctx: BotContext) {
    if (!ctx.from?.id || !this.isAdmin(ctx.from.id)) return;

    const callbackData = (ctx.callbackQuery as any)?.data || '';
    const match = callbackData.match(/^ch_toggle_(.+)$/);
    const channelId = match?.[1];

    try {
      const channel = await this.channelRepo.findOne({ where: { id: channelId } });
      if (channel) {
        channel.isActive = !channel.isActive;
        await this.channelRepo.save(channel);
        await ctx.answerCbQuery(`Kanal ${channel.isActive ? 'yoqildi' : 'o\'chirildi'}`);
        
        // Refresh the channels list
        await this.onChannels(ctx);
      }
    } catch (error) {
      this.logger.error(`Toggle channel error: ${error}`);
      await ctx.answerCbQuery('Xatolik yuz berdi');
    }
  }

  /**
   * Delete channel
   */
  @Action(/^ch_delete_(.+)$/)
  async onDeleteChannel(@Ctx() ctx: BotContext) {
    if (!ctx.from?.id || !this.isAdmin(ctx.from.id)) return;

    const callbackData = (ctx.callbackQuery as any)?.data || '';
    const match = callbackData.match(/^ch_delete_(.+)$/);
    const channelId = match?.[1];

    try {
      await this.channelRepo.delete({ id: channelId });
      await ctx.answerCbQuery('Kanal o\'chirildi');
      await this.onChannels(ctx);
    } catch (error) {
      this.logger.error(`Delete channel error: ${error}`);
      await ctx.answerCbQuery('Xatolik yuz berdi');
    }
  }

  /**
   * Change channel name - start
   */
  @Action(/^ch_name_(.+)$/)
  async onChangeChannelName(@Ctx() ctx: BotContext) {
    if (!ctx.from?.id || !this.isAdmin(ctx.from.id)) return;

    const callbackData = (ctx.callbackQuery as any)?.data || '';
    const match = callbackData.match(/^ch_name_(.+)$/);
    const channelId = match?.[1];

    this.adminStates.set(ctx.from.id, { state: 'editing_channel_name', data: { channelId } });

    await ctx.editMessageText('✏️ Yangi kanal nomini kiriting:', { parse_mode: 'Markdown' });
    await ctx.answerCbQuery();
  }

  /**
   * Broadcast menu
   */
  @Action('admin_broadcast')
  async onBroadcast(@Ctx() ctx: BotContext) {
    if (!ctx.from?.id || !this.isAdmin(ctx.from.id)) return;

    this.adminStates.set(ctx.from.id, { state: 'broadcast_waiting' });

    await ctx.editMessageText(
      `📢 *Post jo'natish*\n\nBarcha foydalanuvchilarga xabar yuboring.\n\nXabaringizni yozing (matn, rasm, video):`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'admin_back')]]),
      }
    );
    await ctx.answerCbQuery();
  }

  /**
   * Back to admin menu
   */
  @Action('admin_back')
  async onBack(@Ctx() ctx: BotContext) {
    if (!ctx.from?.id || !this.isAdmin(ctx.from.id)) return;
    
    this.adminStates.delete(ctx.from.id);
    await this.showAdminMenu(ctx);
  }

  /**
   * Handle text messages for admin
   */
  @On('text')
  async onText(@Ctx() ctx: BotContext) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !this.isAdmin(telegramId)) return;

    const message = ctx.message as Message.TextMessage;
    const text = message?.text;
    if (!text || text.startsWith('/')) return;

    const state = this.adminStates.get(telegramId);
    if (!state) return;

    try {
      switch (state.state) {
        case 'adding_channel_name':
          this.adminStates.set(telegramId, { state: 'adding_channel_id', data: { name: text } });
          await ctx.reply('Kanal ID sini kiriting (masalan: @kanalname yoki -1001234567890):');
          break;

        case 'adding_channel_id':
          // Parse channel ID
          let telegramChannelId: number;
          let telegramChannelUsername: string | null = null;
          
          if (text.startsWith('@')) {
            telegramChannelUsername = text;
            telegramChannelId = 0; // Will be resolved later
          } else {
            telegramChannelId = parseInt(text);
          }

          const newChannel = this.channelRepo.create({
            name: state.data.name,
            telegramChannelId: telegramChannelId,
            telegramChannelUsername: telegramChannelUsername,
            isActive: true,
          });
          await this.channelRepo.save(newChannel);
          
          this.adminStates.delete(telegramId);
          await ctx.reply(`✅ Kanal muvaffaqiyatli qo'shildi!\n\n📺 ${state.data.name}\n\n� Endi Web App orqali tariflar qo'shing.`, {
            ...Markup.inlineKeyboard([[Markup.button.callback('📺 Kanallarga o\'tish', 'admin_channels')]]),
          });
          break;

        case 'editing_channel_name':
          await this.channelRepo.update({ id: state.data.channelId }, { name: text });
          this.adminStates.delete(telegramId);
          await ctx.reply('✅ Kanal nomi yangilandi!', {
            ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', `edit_channel_${state.data.channelId}`)]]),
          });
          break;

        case 'broadcast_waiting':
          // Start broadcast
          await this.startBroadcast(ctx, telegramId, text);
          break;
      }
    } catch (error) {
      this.logger.error(`Admin text handler error: ${error}`);
      await ctx.reply('❌ Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
    }
  }

  /**
   * Handle photo messages for broadcast
   */
  @On('photo')
  async onPhoto(@Ctx() ctx: BotContext) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !this.isAdmin(telegramId)) return;

    const state = this.adminStates.get(telegramId);
    if (!state || state.state !== 'broadcast_waiting') return;

    const message = ctx.message as Message.PhotoMessage;
    const photo = message.photo[message.photo.length - 1];
    const caption = message.caption || '';

    await this.startBroadcast(ctx, telegramId, caption, { type: 'photo', fileId: photo.file_id });
  }

  /**
   * Handle video messages for broadcast
   */
  @On('video')
  async onVideo(@Ctx() ctx: BotContext) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !this.isAdmin(telegramId)) return;

    const state = this.adminStates.get(telegramId);
    if (!state || state.state !== 'broadcast_waiting') return;

    const message = ctx.message as Message.VideoMessage;
    const caption = message.caption || '';

    await this.startBroadcast(ctx, telegramId, caption, { type: 'video', fileId: message.video.file_id });
  }

  /**
   * Start broadcasting to all users
   */
  private async startBroadcast(
    ctx: BotContext, 
    adminId: number, 
    text: string, 
    media?: { type: 'photo' | 'video'; fileId: string }
  ) {
    this.adminStates.delete(adminId);

    const users = await this.userRepo.find();
    let sent = 0;
    let failed = 0;

    await ctx.reply(`📢 Broadcast boshlandi... (${users.length} ta foydalanuvchi)`);

    for (const user of users) {
      try {
        if (media?.type === 'photo') {
          await this.bot.telegram.sendPhoto(user.telegramId.toString(), media.fileId, { caption: text });
        } else if (media?.type === 'video') {
          await this.bot.telegram.sendVideo(user.telegramId.toString(), media.fileId, { caption: text });
        } else {
          await this.bot.telegram.sendMessage(user.telegramId.toString(), text);
        }
        sent++;
      } catch (error) {
        failed++;
        this.logger.warn(`Failed to send to ${user.telegramId}: ${error}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    await ctx.reply(
      `✅ Broadcast tugadi!\n\n✅ Yuborildi: ${sent}\n❌ Xato: ${failed}`,
      { ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Admin panel', 'admin_back')]]) }
    );
  }
}
