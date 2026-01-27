import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot, Update, Ctx, Start, On, Hears, Action } from 'nestjs-telegraf';
import { Telegraf, Context } from 'telegraf';
import { Message, Update as TelegramUpdate } from 'telegraf/typings/core/types/typegram';
import { RedisService } from '../../redis';
import { UserService } from '../services/user.service';
import { PaymeService } from '../../payme/payme.service';
import { UserState, Messages, CallbackPrefix, Buttons } from '../constants';
import {
  getContactKeyboard,
  getMainMenuKeyboard,
  getChannelListKeyboard,
  getChannelDetailsKeyboard,
  getPaymentKeyboard,
  getBackKeyboard,
  getRemoveKeyboard,
} from '../keyboards';
import { PaymentStatus } from '../../database/entities';

interface BotContext extends Context {
  update: TelegramUpdate;
}

@Update()
@Injectable()
export class UserUpdateHandler {
  private readonly logger = new Logger(UserUpdateHandler.name);
  private readonly adminIds: number[];

  constructor(
    @InjectBot() private readonly bot: Telegraf<BotContext>,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly userService: UserService,
    private readonly paymeService: PaymeService,
  ) {
    this.adminIds = this.configService.get<number[]>('telegram.adminIds') || [];
  }

  /**
   * Start command handler
   */
  @Start()
  async onStart(@Ctx() ctx: BotContext) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    try {
      // Check rate limit
      const rateLimit = await this.redisService.checkRateLimit(
        telegramId,
        'start',
        5,
        60,
      );

      if (!rateLimit.allowed) {
        await ctx.reply(
          Messages.ERROR_RATE_LIMIT.replace('{seconds}', rateLimit.resetIn.toString()),
        );
        return;
      }

      // Check if admin
      if (this.adminIds.includes(telegramId)) {
        // Admin gets both options
        await ctx.reply(
          'Siz adminsiz. /admin buyrug\'ini ishlating yoki foydalanuvchi sifatida davom eting.',
        );
      }

      // Check if user is already registered
      const existingUser = await this.userService.findByTelegramId(telegramId);

      if (existingUser) {
        await this.redisService.setUserState(telegramId, UserState.MAIN_MENU);
        await ctx.reply(Messages.ALREADY_REGISTERED, getMainMenuKeyboard());
        return;
      }

      // Start registration
      await this.redisService.setUserState(telegramId, UserState.AWAITING_NAME);
      await ctx.reply(Messages.ENTER_NAME, getRemoveKeyboard());
    } catch (error) {
      this.logger.error(`Start error: ${error}`);
      await ctx.reply(Messages.ERROR_GENERAL);
    }
  }

  /**
   * Handle text messages
   */
  @On('text')
  async onText(@Ctx() ctx: BotContext) {
    const telegramId = ctx.from?.id;
    const message = ctx.message as Message.TextMessage;
    const text = message?.text;

    if (!telegramId || !text) return;

    // Skip all commands starting with / - let command handlers process them
    if (text.startsWith('/')) {
      this.logger.log(`Skipping command: ${text}`);
      return;
    }

    try {
      // Check for cancel
      if (text === Buttons.CANCEL) {
        await this.handleCancel(ctx, telegramId);
        return;
      }

      const state = await this.redisService.getUserState(telegramId);

      if (!state) {
        // No state, check if registered
        const user = await this.userService.findByTelegramId(telegramId);
        if (user) {
          await this.handleMainMenuActions(ctx, telegramId, text);
        } else {
          await ctx.reply('Iltimos, /start buyrug\'ini bosing.');
        }
        return;
      }

      switch (state.step) {
        case UserState.AWAITING_NAME:
          await this.handleNameInput(ctx, telegramId, text);
          break;
        case UserState.AWAITING_PHONE:
          await this.handlePhoneInput(ctx, telegramId, text);
          break;
        case UserState.MAIN_MENU:
          await this.handleMainMenuActions(ctx, telegramId, text);
          break;
        default:
          await this.handleMainMenuActions(ctx, telegramId, text);
      }
    } catch (error) {
      this.logger.error(`Text handler error: ${error}`);
      await ctx.reply(Messages.ERROR_GENERAL);
    }
  }

  /**
   * Handle name input
   */
  private async handleNameInput(
    ctx: BotContext,
    telegramId: number,
    name: string,
  ) {
    if (name.length < 2 || name.length > 100) {
      await ctx.reply(Messages.INVALID_INPUT);
      return;
    }

    // Save name and ask for phone
    await this.redisService.setUserState(telegramId, UserState.AWAITING_PHONE, {
      name,
    });

    await ctx.reply(Messages.ENTER_PHONE, getContactKeyboard());
  }

  /**
   * Handle phone input (text)
   */
  private async handlePhoneInput(
    ctx: BotContext,
    telegramId: number,
    phone: string,
  ) {
    // Validate phone number
    const phoneRegex = /^\+?998\d{9}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    if (!phoneRegex.test(cleanPhone)) {
      await ctx.reply(Messages.INVALID_PHONE);
      return;
    }

    await this.completeRegistration(ctx, telegramId, cleanPhone);
  }

  /**
   * Handle contact share
   */
  @On('contact')
  async onContact(@Ctx() ctx: BotContext) {
    const telegramId = ctx.from?.id;
    const message = ctx.message as Message.ContactMessage;
    const contact = message?.contact;

    if (!telegramId || !contact) return;

    try {
      const state = await this.redisService.getUserState(telegramId);

      if (state?.step !== UserState.AWAITING_PHONE) {
        return;
      }

      // Verify contact belongs to the user
      if (contact.user_id !== telegramId) {
        await ctx.reply('Iltimos, o\'zingizning telefon raqamingizni yuboring.');
        return;
      }

      await this.completeRegistration(ctx, telegramId, contact.phone_number);
    } catch (error) {
      this.logger.error(`Contact handler error: ${error}`);
      await ctx.reply(Messages.ERROR_GENERAL);
    }
  }

  /**
   * Complete user registration
   */
  private async completeRegistration(
    ctx: BotContext,
    telegramId: number,
    phone: string,
  ) {
    const state = await this.redisService.getUserState(telegramId);
    const name = state?.data?.name as string;

    if (!name) {
      await this.redisService.clearUserState(telegramId);
      await ctx.reply('Xatolik. Iltimos, /start buyrug\'ini qayta bosing.');
      return;
    }

    // Format phone
    let formattedPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    // Register user
    await this.userService.register(
      telegramId,
      ctx.from?.username || null,
      name,
      formattedPhone,
    );

    // Clear state and set to main menu
    await this.redisService.setUserState(telegramId, UserState.MAIN_MENU);

    const successMessage = Messages.REGISTRATION_SUCCESS
      .replace('{name}', name)
      .replace('{phone}', formattedPhone);

    await ctx.reply(successMessage, { parse_mode: 'Markdown' });
    await ctx.reply(Messages.MAIN_MENU, getMainMenuKeyboard());
  }

  /**
   * Handle main menu actions
   */
  private async handleMainMenuActions(
    ctx: BotContext,
    telegramId: number,
    text: string,
  ) {
    switch (text) {
      case Buttons.VIEW_CHANNELS:
        await this.showChannels(ctx, telegramId);
        break;
      case Buttons.MY_SUBSCRIPTIONS:
        await this.showMySubscriptions(ctx, telegramId);
        break;
      default:
        await ctx.reply(Messages.MAIN_MENU, getMainMenuKeyboard());
    }
  }

  /**
   * Show available channels
   */
  private async showChannels(ctx: BotContext, telegramId: number) {
    const channels = await this.userService.getActiveChannels();

    if (channels.length === 0) {
      await ctx.reply(Messages.NO_CHANNELS);
      return;
    }

    await this.redisService.setUserState(telegramId, UserState.VIEWING_CHANNELS);
    await ctx.reply(
      Messages.CHANNEL_LIST_HEADER,
      {
        parse_mode: 'Markdown',
        ...getChannelListKeyboard(channels),
      },
    );
  }

  /**
   * Show user subscriptions
   */
  private async showMySubscriptions(ctx: BotContext, telegramId: number) {
    const user = await this.userService.findByTelegramId(telegramId);
    if (!user) return;

    const subscriptions = await this.userService.getUserSubscriptions(user.id);

    if (subscriptions.length === 0) {
      await ctx.reply(Messages.NO_SUBSCRIPTIONS);
      return;
    }

    let message = Messages.MY_SUBSCRIPTIONS_HEADER;

    for (const sub of subscriptions) {
      const daysLeft = sub.endDate
        ? Math.ceil((sub.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

      message += Messages.SUBSCRIPTION_ITEM
        .replace('{channel}', sub.channel?.name || 'Unknown')
        .replace('{expiry}', sub.endDate?.toLocaleDateString('uz-UZ') || 'N/A')
        .replace('{days_left}', Math.max(0, daysLeft).toString()) + '\n';
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  /**
   * Handle channel selection callback
   */
  @Action(new RegExp(`^${CallbackPrefix.CHANNEL_SELECT}`))
  async onChannelSelect(@Ctx() ctx: BotContext) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    try {
      const callbackQuery = ctx.callbackQuery;
      if (!callbackQuery || !('data' in callbackQuery)) return;

      const channelId = callbackQuery.data.replace(CallbackPrefix.CHANNEL_SELECT, '');
      const channel = await this.userService.getChannelById(channelId);

      if (!channel) {
        await ctx.answerCbQuery('Kanal topilmadi');
        return;
      }

      await this.redisService.setUserState(telegramId, UserState.VIEWING_CHANNEL_DETAILS, {
        channelId,
      });

      const message = Messages.CHANNEL_DETAILS
        .replace('{name}', channel.name)
        .replace('{description}', channel.description || '')
        .replace('{price}', channel.price.toString())
        .replace('{duration}', channel.durationDays.toString());

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...getChannelDetailsKeyboard(channelId),
      });
      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error(`Channel select error: ${error}`);
      await ctx.answerCbQuery(Messages.ERROR_GENERAL);
    }
  }

  /**
   * Handle subscribe callback
   */
  @Action(new RegExp(`^${CallbackPrefix.SUBSCRIBE}`))
  async onSubscribe(@Ctx() ctx: BotContext) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    try {
      const callbackQuery = ctx.callbackQuery;
      if (!callbackQuery || !('data' in callbackQuery)) return;

      const channelId = callbackQuery.data.replace(CallbackPrefix.SUBSCRIBE, '');
      const channel = await this.userService.getChannelById(channelId);
      const user = await this.userService.findByTelegramId(telegramId);

      if (!channel || !user) {
        await ctx.answerCbQuery('Xatolik');
        return;
      }

      // Create payment
      const { paymentUrl, paymentId } = await this.paymeService.createPaymentUrl(
        user.id,
        channelId,
        Number(channel.price),
      );

      await this.redisService.setUserState(telegramId, UserState.AWAITING_PAYMENT, {
        channelId,
        paymentId,
      });

      const message = Messages.PAYMENT_LINK
        .replace('{channel}', channel.name)
        .replace('{amount}', channel.price.toString())
        .replace('{link}', paymentUrl);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...getPaymentKeyboard(paymentUrl, paymentId),
      });
      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error(`Subscribe error: ${error}`);
      await ctx.answerCbQuery(Messages.ERROR_GENERAL);
    }
  }

  /**
   * Handle payment check callback
   */
  @Action(new RegExp(`^${CallbackPrefix.CHECK_PAYMENT}`))
  async onCheckPayment(@Ctx() ctx: BotContext) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    try {
      const callbackQuery = ctx.callbackQuery;
      if (!callbackQuery || !('data' in callbackQuery)) return;

      const paymentId = callbackQuery.data.replace(CallbackPrefix.CHECK_PAYMENT, '');
      const payment = await this.userService.getPaymentById(paymentId);

      if (!payment) {
        await ctx.answerCbQuery('To\'lov topilmadi');
        return;
      }

      if (payment.status === PaymentStatus.COMPLETED) {
        // Payment successful - generate invite link
        const user = await this.userService.findByTelegramId(telegramId);
        const channel = await this.userService.getChannelById(payment.channelId || '');

        if (!user || !channel) {
          await ctx.answerCbQuery('Xatolik');
          return;
        }

        // Generate one-time invite link
        let inviteLink: string;
        try {
          const chatInviteLink = await this.bot.telegram.createChatInviteLink(
            channel.telegramChannelId,
            {
              member_limit: 1,
              expire_date: Math.floor(Date.now() / 1000) + 86400, // 24 hours
            },
          );
          inviteLink = chatInviteLink.invite_link;
        } catch (error) {
          this.logger.error(`Failed to create invite link: ${error}`);
          await ctx.answerCbQuery('Havola yaratishda xatolik');
          return;
        }

        // Activate subscription
        const subscription = await this.userService.activateSubscription(
          user.id,
          channel.id,
          inviteLink,
        );

        await this.redisService.setUserState(telegramId, UserState.MAIN_MENU);

        const message = Messages.PAYMENT_SUCCESS
          .replace('{channel}', channel.name)
          .replace('{duration}', channel.durationDays.toString())
          .replace('{expiry}', subscription.endDate?.toLocaleDateString('uz-UZ') || '')
          .replace('{invite_link}', inviteLink);

        await ctx.editMessageText(message, { parse_mode: 'Markdown' });
        await ctx.answerCbQuery('To\'lov muvaffaqiyatli!');
      } else if (payment.status === PaymentStatus.PENDING || payment.status === PaymentStatus.PROCESSING) {
        await ctx.answerCbQuery(Messages.PAYMENT_PENDING, { show_alert: true });
      } else {
        await ctx.answerCbQuery(Messages.PAYMENT_FAILED, { show_alert: true });
      }
    } catch (error) {
      this.logger.error(`Check payment error: ${error}`);
      await ctx.answerCbQuery(Messages.ERROR_GENERAL);
    }
  }

  /**
   * Handle payment cancel callback
   */
  @Action(new RegExp(`^${CallbackPrefix.CANCEL_PAYMENT}`))
  async onCancelPayment(@Ctx() ctx: BotContext) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    try {
      await this.redisService.setUserState(telegramId, UserState.MAIN_MENU);
      await ctx.editMessageText(Messages.OPERATION_CANCELLED);
      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error(`Cancel payment error: ${error}`);
      await ctx.answerCbQuery(Messages.ERROR_GENERAL);
    }
  }

  /**
   * Handle back to channels callback
   */
  @Action(CallbackPrefix.BACK_TO_CHANNELS)
  async onBackToChannels(@Ctx() ctx: BotContext) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    try {
      const channels = await this.userService.getActiveChannels();

      if (channels.length === 0) {
        await ctx.editMessageText(Messages.NO_CHANNELS);
        await ctx.answerCbQuery();
        return;
      }

      await this.redisService.setUserState(telegramId, UserState.VIEWING_CHANNELS);
      await ctx.editMessageText(Messages.CHANNEL_LIST_HEADER, {
        parse_mode: 'Markdown',
        ...getChannelListKeyboard(channels),
      });
      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error(`Back to channels error: ${error}`);
      await ctx.answerCbQuery(Messages.ERROR_GENERAL);
    }
  }

  /**
   * Handle cancel action
   */
  private async handleCancel(ctx: BotContext, telegramId: number) {
    await this.redisService.clearUserState(telegramId);

    const user = await this.userService.findByTelegramId(telegramId);
    if (user) {
      await ctx.reply(Messages.OPERATION_CANCELLED, getMainMenuKeyboard());
    } else {
      await ctx.reply(Messages.OPERATION_CANCELLED, getRemoveKeyboard());
    }
  }
}
