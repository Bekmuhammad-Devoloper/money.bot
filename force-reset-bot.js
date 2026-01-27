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
          console.log(`${result.ok ? '✅' : '❌'} ${description}`);
          console.log(`   Response:`, JSON.stringify(result, null, 2));
          console.log('');
          resolve(result);
        } catch (err) {
          console.error(`❌ Parse xatolik:`, err.message);
          console.log(`   Raw data:`, data);
          reject(err);
        }
      });
    }).on('error', err => {
      console.error(`❌ Request xatolik:`, err.message);
      reject(err);
    });
  });
}

async function forceResetBot() {
  try {
    console.log('🔧 BOTNI MAJBURIY TIKLASH BOSHLANDI\n');
    console.log('=' .repeat(60));
    
    // 1. Hozirgi holatni tekshirish
    const webhookInfo = await makeRequest(
      `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`,
      'Bot webhook holatini tekshirish'
    );

    // 2. Logout qilish - bu BARCHA active sessionlarni bekor qiladi
    const logoutResult = await makeRequest(
      `https://api.telegram.org/bot${BOT_TOKEN}/logOut`,
      '🔴 BARCHA SESSIYALARNI BEKOR QILISH (LOGOUT)'
    );

    if (logoutResult.ok) {
      console.log('✅ Bot barcha sessiyalardan muvaffaqiyatli chiqdi!\n');
      console.log('⏳ 3 soniya kutilmoqda...\n');
      
      // 3 soniya kutish
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 3. Webhook ma'lumotini qayta tekshirish
      await makeRequest(
        `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`,
        'Logout dan keyingi webhook holati'
      );

      // 4. Pending updatelarni o'chirish
      await makeRequest(
        `https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`,
        'Pending updatelarni tozalash'
      );

      // 5. Bot ma'lumotlarini tekshirish
      const meInfo = await makeRequest(
        `https://api.telegram.org/bot${BOT_TOKEN}/getMe`,
        'Bot ma\'lumotlarini tekshirish'
      );

      console.log('=' .repeat(60));
      console.log('🎉 BOT MUVAFFAQIYATLI TIKLANDI!');
      console.log('=' .repeat(60));
      console.log('');
      console.log('📝 KEYINGI QADAMLAR:');
      console.log('   1. Endi botni ishga tushiring: npm run start:dev');
      console.log('   2. Telegram botga /start yuboring');
      console.log('');
      
    } else {
      console.error('❌ Logout xatolik:', logoutResult);
    }
    
  } catch (error) {
    console.error('💥 Fatal xatolik:', error.message);
  }
}

forceResetBot();
