// Uzbek language messages for the bot
export const Messages = {
  // Welcome and registration
  WELCOME: `🤖 *PulOqimi Bot*ga xush kelibsiz!\n\nBu bot orqali premium kanallarga obuna bo'lishingiz mumkin.\n\nRo'yxatdan o'tish uchun /start buyrug'ini bosing.`,
  
  ENTER_NAME: `📝 *Ro'yxatdan o'tish*\n\nIltimos, to'liq ismingizni kiriting:`,
  
  ENTER_PHONE: `📱 *Telefon raqam*\n\nIltimos, telefon raqamingizni kiriting yoki tugmani bosing:`,
  
  INVALID_PHONE: `❌ Telefon raqami noto'g'ri formatda.\n\nIltimos, to'g'ri formatda kiriting: +998901234567`,
  
  REGISTRATION_SUCCESS: `✅ *Ro'yxatdan muvaffaqiyatli o'tdingiz!*\n\n👤 Ism: {name}\n📱 Telefon: {phone}\n\nEndi mavjud kanallarni ko'rishingiz mumkin.`,
  
  ALREADY_REGISTERED: `✅ Siz allaqachon ro'yxatdan o'tgansiz.\n\nAsosiy menyudan foydalaning:`,
  
  // Main menu
  MAIN_MENU: `🏠 *Asosiy menyu*\n\nQuyidagi amallardan birini tanlang:`,
  
  // Channel list
  CHANNEL_LIST_HEADER: `📺 *Mavjud kanallar*\n\nObuna bo'lish uchun kanalni tanlang:`,
  
  NO_CHANNELS: `😔 Hozircha mavjud kanallar yo'q.\n\nKeyinroq qayta tekshiring.`,
  
  // Channel details
  CHANNEL_DETAILS: `📺 *{name}*\n\n{description}\n\n💰 Narxi: {price} so'm\n⏱ Muddat: {duration} kun\n\nObuna bo'lish uchun "To'lov qilish" tugmasini bosing.`,
  
  // Payment
  PAYMENT_LINK: `💳 *To'lov*\n\nKanal: {channel}\nSumma: {amount} so'm\n\nTo'lov qilish uchun quyidagi havolani bosing:\n\n{link}\n\nTo'lov qilganingizdan so'ng "Tekshirish" tugmasini bosing.`,
  
  PAYMENT_SUCCESS: `✅ *To'lov muvaffaqiyatli!*\n\nKanal: {channel}\nMuddat: {duration} kun\nAmal qilish sanasi: {expiry}\n\nQuyidagi havola orqali kanalga qo'shiling:\n\n{invite_link}\n\n⚠️ Bu havola faqat bir marta ishlaydi!`,
  
  PAYMENT_PENDING: `⏳ To'lov hali amalga oshirilmagan.\n\nIltimos, to'lovni amalga oshiring va qaytadan tekshiring.`,
  
  PAYMENT_FAILED: `❌ To'lov amalga oshmadi.\n\nIltimos, qaytadan urinib ko'ring.`,
  
  // Subscriptions
  MY_SUBSCRIPTIONS_HEADER: `📋 *Mening obunalarim*\n\n`,
  
  SUBSCRIPTION_ITEM: `📺 {channel}\n📅 Muddati: {expiry}\n⏳ Qolgan kun: {days_left}\n`,
  
  NO_SUBSCRIPTIONS: `😔 Sizda hozircha obunalar yo'q.\n\nObuna bo'lish uchun kanallarni ko'ring.`,
  
  // Notifications
  EXPIRY_WARNING_1: `⚠️ *Eslatma*\n\n{channel} kanaliga obunangiz ertaga tugaydi.\n\nObunani uzaytirish uchun to'lov qiling.`,
  
  EXPIRY_WARNING_2: `⚠️ *Diqqat!*\n\n{channel} kanaliga obunangiz bugun tugaydi!\n\nObunani uzaytirish uchun to'lov qiling.`,
  
  FINAL_WARNING: `🚨 *Oxirgi ogohlantiruv!*\n\n{channel} kanaliga obunangiz tugadi.\n\nBugun to'lov qilmasangiz, kanaldan chiqarib yuborilasiz!`,
  
  REMOVAL_NOTICE: `❌ *Kanaldan chiqarildingiz*\n\nTo'lov qilinmaganligi sababli {channel} kanalidan chiqarildingiz.\n\nQayta obuna bo'lish uchun /start buyrug'ini bosing.`,
  
  // Errors
  ERROR_GENERAL: `❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.`,
  
  ERROR_RATE_LIMIT: `⏳ Juda ko'p so'rov. Iltimos, {seconds} soniya kuting.`,
  
  // Admin messages
  ADMIN_WELCOME: `👨‍💼 *Admin panel*\n\nXush kelibsiz! Quyidagi bo'limlardan birini tanlang:`,
  
  ADMIN_STATS: `📊 *Statistika*\n\n👥 Jami foydalanuvchilar: {total_users}\n✅ Faol obunalar: {active_subs}\n⏳ Bugun tugaydiganlar: {expiring_today}\n\n💰 Bugungi daromad: {today_revenue} so'm\n💰 Oylik daromad: {monthly_revenue} so'm`,
  
  ADMIN_CHANNEL_LIST: `📺 *Kanallar ro'yxati*\n\nQuyidagi kanallarni boshqaring:`,
  
  ADMIN_NO_CHANNELS: `📺 Hozircha kanallar qo'shilmagan.\n\nYangi kanal qo'shish uchun tugmani bosing.`,
  
  ADMIN_ADD_CHANNEL_NAME: `📝 Yangi kanal qo'shish\n\nKanal nomini kiriting:`,
  
  ADMIN_ADD_CHANNEL_ID: `🆔 Kanal ID sini kiriting:\n\n(Telegram kanalning ID si, masalan: -1001234567890)`,
  
  ADMIN_ADD_CHANNEL_PRICE: `💰 Obuna narxini kiriting (so'mda):`,
  
  ADMIN_ADD_CHANNEL_DURATION: `⏱ Obuna muddatini kiriting (kunlarda):`,
  
  ADMIN_CHANNEL_ADDED: `✅ Kanal muvaffaqiyatli qo'shildi!\n\n📺 Nomi: {name}\n💰 Narxi: {price} so'm\n⏱ Muddat: {duration} kun`,
  
  ADMIN_CHANNEL_DELETED: `✅ Kanal o'chirildi.`,
  
  ADMIN_CHANNEL_UPDATED: `✅ Kanal yangilandi.`,
  
  ADMIN_CONFIRM_DELETE: `⚠️ *Tasdiqlash*\n\n{name} kanalini o'chirmoqchimisiz?\n\nBu amalni ortga qaytarib bo'lmaydi!`,
  
  ADMIN_USER_MANAGEMENT: `👥 *Foydalanuvchilar*\n\nQuyidagi bo'limlardan birini tanlang:`,
  
  ADMIN_SUBSCRIBED_USERS: `✅ *Obunadorlar ro'yxati*\n\nJami: {count} ta\n\nExcel formatida yuklab olish uchun tugmani bosing.`,
  
  ADMIN_INTERESTED_USERS: `👀 *Qiziquvchilar ro'yxati*\n\n(Ro'yxatdan o'tgan, lekin obuna bo'lmagan)\n\nJami: {count} ta\n\nExcel formatida yuklab olish uchun tugmani bosing.`,
  
  ADMIN_BROADCAST_MENU: `📢 *E'lon yuborish*\n\nBarcha foydalanuvchilarga xabar yuborish.\n\nXabar turini tanlang:`,
  
  ADMIN_BROADCAST_TEXT: `📝 Xabar matnini kiriting:`,
  
  ADMIN_BROADCAST_MEDIA: `📷 Rasm yoki video yuboring:`,
  
  ADMIN_BROADCAST_CONFIRM: `⚠️ *Tasdiqlash*\n\nBu xabar {count} ta foydalanuvchiga yuboriladi.\n\nDavom etishni xohlaysizmi?`,
  
  ADMIN_BROADCAST_STARTED: `🚀 E'lon yuborish boshlandi...\n\nJami: {total}\nYuborildi: {sent}\nXato: {failed}`,
  
  ADMIN_BROADCAST_COMPLETED: `✅ E'lon yuborish tugallandi!\n\nJami: {total}\nYuborildi: {sent}\nXato: {failed}`,
  
  ADMIN_EXPORT_READY: `📁 Fayl tayyor!\n\nYuklash uchun quyidagi faylni bosing.`,
  
  INVALID_INPUT: `❌ Noto'g'ri kiritma. Iltimos, qaytadan kiriting.`,
  
  OPERATION_CANCELLED: `❌ Amal bekor qilindi.`,
} as const;

// Button texts
export const Buttons = {
  // User buttons
  SHARE_CONTACT: '📱 Telefon raqamni ulashish',
  VIEW_CHANNELS: '📺 Kanallarni ko\'rish',
  MY_SUBSCRIPTIONS: '📋 Mening obunalarim',
  PAY: '💳 To\'lov qilish',
  CHECK_PAYMENT: '✅ Tekshirish',
  CANCEL: '❌ Bekor qilish',
  BACK: '⬅️ Orqaga',
  
  // Admin buttons
  STATISTICS: '📊 Statistika',
  CHANNELS: '📺 Kanallar',
  USERS: '👥 Foydalanuvchilar',
  BROADCAST: '📢 E\'lon yuborish',
  ADD_CHANNEL: '➕ Kanal qo\'shish',
  EDIT: '✏️ Tahrirlash',
  DELETE: '🗑 O\'chirish',
  CONFIRM: '✅ Tasdiqlash',
  SUBSCRIBED_USERS: '✅ Obunadorlar',
  INTERESTED_USERS: '👀 Qiziquvchilar',
  EXPORT_EXCEL: '📁 Excel yuklab olish',
  TEXT_MESSAGE: '📝 Matn',
  PHOTO_MESSAGE: '📷 Rasm',
  VIDEO_MESSAGE: '🎬 Video',
  SEND_BROADCAST: '📤 Yuborish',
  TOGGLE_ACTIVE: '🔄 Faollashtirish',
  TOGGLE_INACTIVE: '⏸ To\'xtatish',
} as const;
