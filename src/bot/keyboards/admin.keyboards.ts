import { Markup } from 'telegraf';
import { Buttons, CallbackPrefix } from '../constants';
import { Channel } from '../../database/entities';

/**
 * Admin main menu keyboard
 */
export function getAdminMainMenuKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback(Buttons.STATISTICS, CallbackPrefix.ADMIN_STATS)],
    [Markup.button.callback(Buttons.CHANNELS, CallbackPrefix.ADMIN_CHANNELS)],
    [Markup.button.callback(Buttons.USERS, CallbackPrefix.ADMIN_USERS)],
    [Markup.button.callback(Buttons.BROADCAST, CallbackPrefix.ADMIN_BROADCAST)],
  ]);
}

/**
 * Admin back button
 */
export function getAdminBackKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback(Buttons.BACK, CallbackPrefix.ADMIN_BACK)],
  ]);
}

/**
 * Admin channel management keyboard
 */
export function getAdminChannelListKeyboard(channels: Channel[]) {
  const buttons: ReturnType<typeof Markup.button.callback>[][] = [];

  channels.forEach((channel) => {
    const statusIcon = channel.isActive ? '✅' : '⏸';
    buttons.push([
      Markup.button.callback(
        `${statusIcon} ${channel.name} - ${channel.price} so'm`,
        `${CallbackPrefix.EDIT_CHANNEL}${channel.id}`,
      ),
    ]);
  });

  buttons.push([Markup.button.callback(Buttons.ADD_CHANNEL, CallbackPrefix.ADD_CHANNEL)]);
  buttons.push([Markup.button.callback(Buttons.BACK, CallbackPrefix.ADMIN_BACK)]);

  return Markup.inlineKeyboard(buttons);
}

/**
 * Admin channel edit keyboard
 */
export function getAdminChannelEditKeyboard(channel: Channel) {
  const toggleText = channel.isActive ? Buttons.TOGGLE_INACTIVE : Buttons.TOGGLE_ACTIVE;

  return Markup.inlineKeyboard([
    [Markup.button.callback(Buttons.EDIT, `edit_name_${channel.id}`)],
    [Markup.button.callback(toggleText, `${CallbackPrefix.TOGGLE_CHANNEL}${channel.id}`)],
    [Markup.button.callback(Buttons.DELETE, `${CallbackPrefix.DELETE_CHANNEL}${channel.id}`)],
    [Markup.button.callback(Buttons.BACK, CallbackPrefix.ADMIN_CHANNELS)],
  ]);
}

/**
 * Admin confirm delete keyboard
 */
export function getAdminConfirmDeleteKeyboard(channelId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(Buttons.CONFIRM, `${CallbackPrefix.CONFIRM_DELETE}${channelId}`),
      Markup.button.callback(Buttons.CANCEL, CallbackPrefix.CANCEL_DELETE),
    ],
  ]);
}

/**
 * Admin user management keyboard
 */
export function getAdminUserManagementKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback(Buttons.SUBSCRIBED_USERS, CallbackPrefix.SUBSCRIBED_USERS)],
    [Markup.button.callback(Buttons.INTERESTED_USERS, CallbackPrefix.INTERESTED_USERS)],
    [Markup.button.callback(Buttons.BACK, CallbackPrefix.ADMIN_BACK)],
  ]);
}

/**
 * Admin export keyboard for subscribed users
 */
export function getAdminSubscribedUsersKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback(Buttons.EXPORT_EXCEL, CallbackPrefix.EXPORT_SUBSCRIBED)],
    [Markup.button.callback(Buttons.BACK, CallbackPrefix.ADMIN_USERS)],
  ]);
}

/**
 * Admin export keyboard for interested users
 */
export function getAdminInterestedUsersKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback(Buttons.EXPORT_EXCEL, CallbackPrefix.EXPORT_INTERESTED)],
    [Markup.button.callback(Buttons.BACK, CallbackPrefix.ADMIN_USERS)],
  ]);
}

/**
 * Admin broadcast menu keyboard
 */
export function getAdminBroadcastMenuKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback(Buttons.TEXT_MESSAGE, CallbackPrefix.BROADCAST_TEXT)],
    [Markup.button.callback(Buttons.PHOTO_MESSAGE, CallbackPrefix.BROADCAST_PHOTO)],
    [Markup.button.callback(Buttons.VIDEO_MESSAGE, CallbackPrefix.BROADCAST_VIDEO)],
    [Markup.button.callback(Buttons.BACK, CallbackPrefix.ADMIN_BACK)],
  ]);
}

/**
 * Admin broadcast confirm keyboard
 */
export function getAdminBroadcastConfirmKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback(Buttons.SEND_BROADCAST, CallbackPrefix.CONFIRM_BROADCAST)],
    [Markup.button.callback(Buttons.CANCEL, CallbackPrefix.CANCEL_BROADCAST)],
  ]);
}

/**
 * Pagination keyboard
 */
export function getPaginationKeyboard(
  currentPage: number,
  totalPages: number,
  prefix: string,
) {
  const buttons: ReturnType<typeof Markup.button.callback>[] = [];

  if (currentPage > 1) {
    buttons.push(
      Markup.button.callback('⬅️', `${prefix}${currentPage - 1}`),
    );
  }

  buttons.push(
    Markup.button.callback(`${currentPage}/${totalPages}`, 'noop'),
  );

  if (currentPage < totalPages) {
    buttons.push(
      Markup.button.callback('➡️', `${prefix}${currentPage + 1}`),
    );
  }

  return Markup.inlineKeyboard([buttons]);
}

/**
 * Admin cancel keyboard (reply)
 */
export function getAdminCancelKeyboard() {
  return Markup.keyboard([[Buttons.CANCEL]]).resize();
}
