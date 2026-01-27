// Bot states for user flow
export enum UserState {
  // Initial states
  START = 'start',
  
  // Registration states
  AWAITING_NAME = 'awaiting_name',
  AWAITING_PHONE = 'awaiting_phone',
  
  // Channel selection
  VIEWING_CHANNELS = 'viewing_channels',
  VIEWING_CHANNEL_DETAILS = 'viewing_channel_details',
  
  // Payment flow
  AWAITING_PAYMENT = 'awaiting_payment',
  PAYMENT_PROCESSING = 'payment_processing',
  
  // Main menu
  MAIN_MENU = 'main_menu',
}

// Admin states for panel navigation
export enum AdminState {
  MAIN_MENU = 'admin_main_menu',
  
  // Statistics
  VIEWING_STATS = 'viewing_stats',
  
  // Channel management
  CHANNEL_MANAGEMENT = 'channel_management',
  ADDING_CHANNEL_NAME = 'adding_channel_name',
  ADDING_CHANNEL_ID = 'adding_channel_id',
  ADDING_CHANNEL_PRICE = 'adding_channel_price',
  ADDING_CHANNEL_DURATION = 'adding_channel_duration',
  EDITING_CHANNEL = 'editing_channel',
  EDITING_CHANNEL_NAME = 'editing_channel_name',
  EDITING_CHANNEL_PRICE = 'editing_channel_price',
  EDITING_CHANNEL_DURATION = 'editing_channel_duration',
  CONFIRMING_CHANNEL_DELETE = 'confirming_channel_delete',
  
  // User management
  USER_MANAGEMENT = 'user_management',
  VIEWING_SUBSCRIBED_USERS = 'viewing_subscribed_users',
  VIEWING_INTERESTED_USERS = 'viewing_interested_users',
  
  // Broadcasting
  BROADCAST_MENU = 'broadcast_menu',
  BROADCAST_AWAITING_CONTENT = 'broadcast_awaiting_content',
  BROADCAST_CONFIRMING = 'broadcast_confirming',
}

// Callback data prefixes
export const CallbackPrefix = {
  // User callbacks
  CHANNEL_SELECT: 'channel_',
  SUBSCRIBE: 'subscribe_',
  PAY: 'pay_',
  CHECK_PAYMENT: 'check_pay_',
  CANCEL_PAYMENT: 'cancel_pay_',
  MY_SUBSCRIPTIONS: 'my_subs',
  BACK_TO_CHANNELS: 'back_channels',
  
  // Admin callbacks
  ADMIN_STATS: 'admin_stats',
  ADMIN_CHANNELS: 'admin_channels',
  ADMIN_USERS: 'admin_users',
  ADMIN_BROADCAST: 'admin_broadcast',
  ADMIN_BACK: 'admin_back',
  
  // Channel management
  ADD_CHANNEL: 'add_channel',
  EDIT_CHANNEL: 'edit_channel_',
  DELETE_CHANNEL: 'delete_channel_',
  CONFIRM_DELETE: 'confirm_del_',
  CANCEL_DELETE: 'cancel_del',
  TOGGLE_CHANNEL: 'toggle_channel_',
  
  // User management
  SUBSCRIBED_USERS: 'subscribed_users',
  INTERESTED_USERS: 'interested_users',
  EXPORT_SUBSCRIBED: 'export_subscribed',
  EXPORT_INTERESTED: 'export_interested',
  
  // Broadcast
  BROADCAST_TEXT: 'broadcast_text',
  BROADCAST_PHOTO: 'broadcast_photo',
  BROADCAST_VIDEO: 'broadcast_video',
  CONFIRM_BROADCAST: 'confirm_broadcast',
  CANCEL_BROADCAST: 'cancel_broadcast',
  
  // Pagination
  PAGE: 'page_',
} as const;
