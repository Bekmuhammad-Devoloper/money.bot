import { Markup } from 'telegraf';
import { Buttons, CallbackPrefix } from '../constants';
import { Channel } from '../../database/entities';

/**
 * Keyboard for sharing phone contact during registration
 */
export function getContactKeyboard() {
  return Markup.keyboard([
    [Markup.button.contactRequest(Buttons.SHARE_CONTACT)],
  ]).resize().oneTime();
}

/**
 * Main menu keyboard for regular users
 */
export function getMainMenuKeyboard() {
  return Markup.keyboard([
    [Buttons.VIEW_CHANNELS],
    [Buttons.MY_SUBSCRIPTIONS],
  ]).resize();
}

/**
 * Remove keyboard
 */
export function getRemoveKeyboard() {
  return Markup.removeKeyboard();
}

/**
 * Inline keyboard for channel list
 */
export function getChannelListKeyboard(channels: Channel[]) {
  const buttons = channels.map((channel) => [
    Markup.button.callback(
      `📺 ${channel.name} - ${channel.price} so'm`,
      `${CallbackPrefix.CHANNEL_SELECT}${channel.id}`,
    ),
  ]);

  return Markup.inlineKeyboard(buttons);
}

/**
 * Inline keyboard for channel details
 */
export function getChannelDetailsKeyboard(channelId: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(Buttons.PAY, `${CallbackPrefix.SUBSCRIBE}${channelId}`)],
    [Markup.button.callback(Buttons.BACK, CallbackPrefix.BACK_TO_CHANNELS)],
  ]);
}

/**
 * Inline keyboard for payment
 */
export function getPaymentKeyboard(paymentUrl: string, paymentId: string) {
  return Markup.inlineKeyboard([
    [Markup.button.url(Buttons.PAY, paymentUrl)],
    [Markup.button.callback(Buttons.CHECK_PAYMENT, `${CallbackPrefix.CHECK_PAYMENT}${paymentId}`)],
    [Markup.button.callback(Buttons.CANCEL, `${CallbackPrefix.CANCEL_PAYMENT}${paymentId}`)],
  ]);
}

/**
 * Back button only
 */
export function getBackKeyboard(callbackData: string = CallbackPrefix.BACK_TO_CHANNELS) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(Buttons.BACK, callbackData)],
  ]);
}

/**
 * Subscription list keyboard with renewal options
 */
export function getSubscriptionListKeyboard(
  subscriptions: Array<{ id: string; channelName: string; channelId: string }>,
) {
  const buttons = subscriptions.map((sub) => [
    Markup.button.callback(
      `📺 ${sub.channelName}`,
      `${CallbackPrefix.CHANNEL_SELECT}${sub.channelId}`,
    ),
  ]);

  buttons.push([Markup.button.callback(Buttons.BACK, CallbackPrefix.BACK_TO_CHANNELS)]);

  return Markup.inlineKeyboard(buttons);
}

/**
 * Cancel only keyboard
 */
export function getCancelKeyboard() {
  return Markup.keyboard([[Buttons.CANCEL]]).resize();
}
