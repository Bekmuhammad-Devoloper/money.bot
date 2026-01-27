const https = require('https');
const fs = require('fs');
const path = require('path');

// .env faylini o'qish
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const botTokenMatch = envContent.match(/BOT_TOKEN=(.+)/);

if (!botTokenMatch) {
  console.error('BOT_TOKEN topilmadi .env faylida');
  process.exit(1);
}

const BOT_TOKEN = botTokenMatch[1].trim();
console.log('Bot Token topildi:', BOT_TOKEN.substring(0, 10) + '...\n');

function makeRequest(url, description) {
  return new Promise((resolve, reject) => {
    console.log(`📡 ${description}...`);
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`✅ ${description}: ${result.ok ? 'Muvaffaqiyatli' : 'Xatolik'}`);
          console.log(`   Response:`, result);
          console.log('');
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', err => reject(err));
  });
}

async function resetBot() {
  try {
    // 1. Avvalgi bot holatini tekshirish
    await makeRequest(
      `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`,
      'Bot holatini tekshirish'
    );

    // 2. Pending updatelarni o'chirish bilan webhookni o'chirish
    await makeRequest(
      `https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`,
      'Webhookni o\'chirish va pending updatelarni tozalash'
    );

    // 3. Bot ma'lumotlarini olish (tekshirish uchun)
    await makeRequest(
      `https://api.telegram.org/bot${BOT_TOKEN}/getMe`,
      'Bot ma\'lumotlarini olish'
    );

    console.log('🎉 Bot sessiyasi muvaffaqiyatli tiklandi!');
    console.log('💡 Endi botni ishga tushiring: npm run start:dev');
    
  } catch (error) {
    console.error('❌ Xatolik:', error.message);
  }
}

resetBot();
