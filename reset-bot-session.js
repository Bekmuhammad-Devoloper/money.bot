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
console.log('Bot Token topildi:', BOT_TOKEN.substring(0, 10) + '...');

// Webhook o'rnatish (bo'sh URL bilan - bu avvalgi sessionni bekor qiladi)
const setWebhookUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=`;

console.log('Webhook orqali avvalgi sessionni bekor qilish...');
https.get(setWebhookUrl, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('setWebhook response:', data);
    
    // Webhookni o'chirish (polling rejimiga qaytish)
    setTimeout(() => {
      const deleteWebhookUrl = `https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`;
      
      console.log('Webhookni o\'chirish va polling rejimiga qaytish...');
      https.get(deleteWebhookUrl, (res2) => {
        let data2 = '';
        res2.on('data', chunk => data2 += chunk);
        res2.on('end', () => {
          console.log('deleteWebhook response:', data2);
          console.log('\n✅ Bot sessiyasi tiklandi! Endi botni ishga tushiring: npm run start:dev');
        });
      }).on('error', err => console.error('Xatolik:', err.message));
    }, 1000);
  });
}).on('error', err => console.error('Xatolik:', err.message));
