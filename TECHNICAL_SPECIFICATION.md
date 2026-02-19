# TEXNIK TOPSHIRIQ (TZ)
## PulOqimi Bot - Telegram Obuna Boshqaruv Tizimi

---

## 📋 LOYIHA HAQIDA

**Loyiha nomi:** PulOqimi Bot  
**Maqsad:** Telegram orqali pullik kanallarga obuna bo'lish va to'lovlarni boshqarish  
**Versiya:** 1.0.0  
**Til:** O'zbek tili  
**To'lov tizimi:** Payme (O'zbekiston)  

---

## 🎯 ASOSIY FUNKSIYALAR

### 1. FOYDALANUVCHI QISMI

#### 1.1 Ro'yxatdan o'tish
- **Jarayon:**
  1. `/start` buyrug'ini bosish
  2. To'liq ism kiritish (lotin yoki kirill)
  3. Telefon raqam kiritish (+998XXXXXXXXX format)
  4. Avtomatik tasdiqlash
  
- **Tekshiruvlar:**
  - Telefon raqam formati: +998 bilan boshlanishi shart
  - Telegram ID unikal bo'lishi kerak
  - Ism bo'sh bo'lmasligi kerak (minimum 3 belgi)

- **Database:**
  - `users` jadvaliga qo'shiladi
  - Status: `registered`
  - TelegramId, FullName, PhoneNumber saqlanadi

#### 1.2 Kanallar Ro'yxati
- **Ko'rsatish:**
  - Barcha faol kanallar inline tugmalar bilan
  - Har bir kanal: Nomi, Narxi, Muddat (kunlarda)
  - Kanal tavsifi va qo'shimcha ma'lumotlar

- **Filtrlash:**
  - Faqat `isActive: true` kanallar ko'rsatiladi
  - Narx bo'yicha saralash (ixtiyoriy)

#### 1.3 Kanal Tanlash va To'lov
- **Jarayon:**
  1. Kanalni tanlash
  2. Kanal ma'lumotlarini ko'rish (ism, tavsif, narx, muddat)
  3. "To'lov qilish" tugmasini bosish
  4. Payme to'lov havolasi yaratiladi
  5. Foydalanuvchi Payme saytida to'lov qiladi
  6. "Tekshirish" tugmasi orqali to'lovni tasdiqlash

- **To'lov Ma'lumotlari:**
  - Kanal ID
  - Foydalanuvchi ID
  - Summa (so'mda)
  - Status: `pending` → `paid` / `failed`
  - Payme transaction ID

#### 1.4 Kanalga Qo'shilish
- **To'lov muvaffaqiyatli bo'lganda:**
  1. Bir martalik invite link yaratiladi
  2. Link foydalanuvchiga yuboriladi
  3. Foydalanuvchi linkni bosib kanalga qo'shiladi
  4. Link 24 soat yoki 1 marta ishlatilgandan keyin o'chiriladi

- **Obuna Ma'lumotlari:**
  - Kanal ID
  - Boshlanish sanasi (bugun)
  - Tugash sanasi (bugun + muddat kunlari)
  - Status: `active`

#### 1.5 Obunalarni Ko'rish
- **Ko'rsatish:**
  - Barcha faol obunalar
  - Har bir obuna: Kanal nomi, Tugash sanasi, Qolgan kunlar
  - Tugagan obunalar alohida bo'lim (ixtiyoriy)

---

### 2. AVTOMATIK BILDIRISHNOMALAR TIZIMI

#### 2.1 Vaqt Jadvali
Bot **har kuni soat 09:00 da** quyidagi tekshiruvlarni amalga oshiradi:

#### 2.2 Bildirishnoma Turlari

**📅 Kun 29 (Ertaga tugaydi)**
- **Trigger:** Obuna 1 kun qolganda
- **Xabar:** "⚠️ Eslatma: {kanal} kanaliga obunangiz ertaga tugaydi. Obunani uzaytirish uchun to'lov qiling."
- **Tip:** `EXPIRY_WARNING_1`

**📅 Kun 30 (Bugun tugaydi)**
- **Trigger:** Obuna tugash kuni
- **Xabar:** "⚠️ Diqqat! {kanal} kanaliga obunangiz bugun tugaydi! Obunani uzaytirish uchun to'lov qiling."
- **Tip:** `EXPIRY_WARNING_2`

**📅 Kun 31 (1 kun o'tgan)**
- **Trigger:** Obuna 1 kun oldin tugagan
- **Xabar:** "🚨 Oxirgi ogohlantiruv! {kanal} kanaliga obunangiz tugadi. Bugun to'lov qilmasangiz, kanaldan chiqarib yuborilasiz!"
- **Tip:** `FINAL_WARNING`

**📅 Kun 32 (2 kun o'tgan - O'chirish)**
- **Trigger:** Obuna 2 kun oldin tugagan
- **Action:** 
  1. Foydalanuvchini kanaldan kick qilish
  2. Obuna statusini `removed` ga o'zgartirish
  3. Foydalanuvchi statusini `removed` ga o'zgartirish
- **Xabar:** "❌ Kanaldan chiqarildingiz: To'lov qilinmaganligi sababli {kanal} kanalidan chiqarildingiz. Qayta obuna bo'lish uchun /start buyrug'ini bosing."
- **Tip:** `REMOVAL_NOTICE`

#### 2.3 Bildirishnoma Database
```sql
notifications (
  id: UUID,
  userId: UUID (foreign key),
  subscriptionId: UUID (foreign key),
  type: ENUM (EXPIRY_WARNING_1, EXPIRY_WARNING_2, FINAL_WARNING, REMOVAL_NOTICE),
  status: ENUM (pending, sent, failed),
  sentAt: TIMESTAMP,
  createdAt: TIMESTAMP
)
```

---

### 3. ADMIN PANEL

#### 3.1 Statistika Dashboard
- **Ko'rsatiladi:**
  - 👥 Jami foydalanuvchilar soni
  - ✅ Faol obunalar soni
  - ⏳ Bugun tugaydiganlar soni
  - 💰 Bugungi daromad (so'mda)
  - 💰 Oylik daromad (so'mda)
  - 📈 Haftalik grafik (ixtiyoriy)

#### 3.2 Kanal Boshqaruvi

**➕ Kanal Qo'shish:**
- Kanal nomi (O'zbekcha)
- Kanal ID (Telegram kanal ID, masalan: -1001234567890)
- Kanal tavsifi (ixtiyoriy, markdown qo'llab-quvvatlaydi)
- Narxi (so'mda, faqat raqamlar)
- Muddat (kunlarda, masalan: 30)
- Holat (Faol/Faol emas)

**✏️ Kanal Tahrirlash:**
- Barcha maydonlarni o'zgartirish mumkin
- Mavjud obunalarga ta'sir qilmaydi

**🗑️ Kanal O'chirish:**
- Tasdiqlash dialog oynasi
- O'chirilgan kanal tarixi saqlanadi
- Mavjud obunalar davom etadi

**🔄 Kanal Faol/Faol Emas:**
- Faol emas kanallar yangi obunalarga ko'rinmaydi
- Mavjud obunalar davom etadi

#### 3.3 Foydalanuvchilar Boshqaruvi

**📊 Obunadorlar Ro'yxati:**
- Barcha faol obunali foydalanuvchilar
- Excel formatda export
- Maydonlar: ID, Ism, Telefon, Kanal, Boshlanish, Tugash

**👀 Qiziquvchilar Ro'yxati:**
- Ro'yxatdan o'tgan, lekin obuna bo'lmagan
- Excel formatda export
- Maydonlar: ID, Ism, Telefon, Ro'yxatdan o'tgan sana

**Excel Format:**
```
| Telegram ID | To'liq Ism | Telefon | Kanal | Boshlanish | Tugash | Qolgan Kunlar |
|-------------|------------|---------|-------|------------|--------|---------------|
```

#### 3.4 E'lon Yuborish (Broadcast)

**Xabar Turlari:**
- 📝 Matn xabar
- 📷 Rasm + matn
- 🎥 Video + matn

**Jarayon:**
1. Xabar turini tanlash
2. Kontent yuborish (matn/rasm/video)
3. Tasdiqlash ("X ta foydalanuvchiga yuboriladi")
4. Yuborish boshlash
5. Real-time progress: Jami / Yuborildi / Xato

**Qoidalar:**
- Faqat faol (blocked emas) foydalanuvchilarga yuboriladi
- 30 ta xabar/soniya (rate limiting)
- Xatolar logga yoziladi

---

## 🗄️ DATABASE STRUKTURA

### 4.1 Jadvallar

#### **users**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'registered', -- registered, active, expired, removed
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **channels**
```sql
CREATE TABLE channels (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  telegram_channel_id BIGINT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration INTEGER NOT NULL, -- days
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **plans** (kanalga tegishli tariflar)
```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY,
  channel_id UUID REFERENCES channels(id),
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration VARCHAR(20) NOT NULL, -- monthly, quarterly, yearly
  duration_days INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **subscriptions**
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  channel_id UUID REFERENCES channels(id),
  plan_id UUID REFERENCES plans(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- active, expired, cancelled, removed
  invite_link VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **payments**
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  subscription_id UUID REFERENCES subscriptions(id),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'UZS',
  status VARCHAR(20) DEFAULT 'pending', -- pending, paid, failed, cancelled
  payme_transaction_id VARCHAR(255),
  payme_order_id VARCHAR(255),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **notifications**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  subscription_id UUID REFERENCES subscriptions(id),
  type VARCHAR(50) NOT NULL, -- EXPIRY_WARNING_1, EXPIRY_WARNING_2, FINAL_WARNING, REMOVAL_NOTICE
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
  message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### **broadcasts**
```sql
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY,
  type VARCHAR(20) NOT NULL, -- text, photo, video
  content TEXT,
  media_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending', -- pending, sending, completed, failed
  total_users INTEGER,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

---

## 🔧 TEXNIK XUSUSIYATLAR

### 5.1 Backend Stack
- **Framework:** NestJS 10+ (Node.js)
- **Language:** TypeScript 5+
- **Database:** PostgreSQL 14+
- **Cache:** Redis 7+
- **ORM:** TypeORM
- **Bot Framework:** Telegraf 4+ (nestjs-telegraf)
- **Scheduler:** @nestjs/schedule (node-cron)

### 5.2 To'lov Integratsiyasi
- **Provider:** Payme Merchant API
- **Endpoint:** `/payme` (POST)
- **Authentication:** Basic Auth (Merchant ID + Secret Key)
- **Callback:** Webhook URL

### 5.3 Redis Foydalanish
- **Session:** Foydalanuvchi holatini saqlash
- **Cache:** Kanal ro'yxati, statistika
- **Rate Limiting:** So'rovlarni cheklash (5 ta/soniya)
- **Lock:** Scheduler dublikatlarini oldini olish

### 5.4 Scheduler
- **Cron:** Har kuni 09:00 AM (Asia/Tashkent)
- **Lock:** Redis distributed lock (5 daqiqa timeout)
- **Parallel:** 10 ta foydalanuvchi bir vaqtda

### 5.5 Xavfsizlik
- **Admin Tekshirish:** ADMIN_IDS environment variable
- **Payme Validation:** Signature tekshirish
- **SQL Injection:** TypeORM parametrli so'rovlar
- **XSS:** Markdown sanitization
- **Rate Limiting:** 5 ta so'rov/soniya (foydalanuvchi uchun)

---

## 📱 FOYDALANUVCHI INTERFEYSI

### 6.1 Asosiy Tugmalar

**Oddiy Foydalanuvchi:**
```
📺 Kanallar       📋 Obunalarim
💰 To'lov         📞 Yordam
```

**Admin (qo'shimcha):**
```
👨‍💼 Admin Panel
```

### 6.2 Inline Tugmalar

**Kanal Tanlash:**
```
[📺 Kanal 1 - 50,000 so'm (30 kun)]
[📺 Kanal 2 - 100,000 so'm (30 kun)]
```

**To'lov:**
```
[💳 Payme orqali to'lash]
[✅ To'lovni tekshirish]
[❌ Bekor qilish]
```

**Admin Kanal Boshqaruvi:**
```
[✏️ Tahrirlash]  [🗑️ O'chirish]
[🔄 Faol/Faol emas]
```

---

## 🚀 DEPLOYMENT

### 7.1 Environment Variables
```env
# Telegram
BOT_TOKEN=1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ
ADMIN_IDS=123456789,987654321

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=puloqimi_bot

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Payme
PAYME_MERCHANT_ID=your_merchant_id
PAYME_SECRET_KEY=your_secret_key
PAYME_TEST_SECRET_KEY=your_test_key
PAYME_CHECKOUT_URL=https://checkout.paycom.uz

# App
APP_PORT=3000
APP_URL=https://your-domain.com
NODE_ENV=production
```

### 7.2 PM2 Deployment
```bash
# Build
npm run build

# Start
pm2 start dist/main.js --name "puloqimi-bot"

# Logs
pm2 logs puloqimi-bot

# Restart
pm2 restart puloqimi-bot

# Auto-restart on server reboot
pm2 startup
pm2 save
```

### 7.3 Docker Deployment
```bash
# Build image
docker build -t puloqimi-bot .

# Run with docker-compose
docker-compose up -d

# Logs
docker-compose logs -f bot
```

---

## 📊 MONITORING VA LOGGING

### 8.1 Logs
- **Format:** JSON (production) / Pretty (development)
- **Levels:** error, warn, log, debug, verbose
- **Rotation:** 7 kun (PM2 yoki Winston)

### 8.2 Metrics
- Jami foydalanuvchilar
- Faol obunalar
- Kunlik to'lovlar
- Bildirishnomalar yuborilishi
- API response time

### 8.3 Alerts
- Database connection error
- Redis connection error
- Payme webhook failure
- Scheduler failure
- High error rate (> 5%)

---

## 🧪 TESTING

### 9.1 Unit Tests
- Services: 80%+ coverage
- Handlers: 70%+ coverage
- Utils: 90%+ coverage

### 9.2 Integration Tests
- Database operations
- Payme callback
- Scheduler execution

### 9.3 E2E Tests
- User registration flow
- Subscription purchase flow
- Expiry notification flow

---

## 📝 KAM JOYLARNI TO'LDIRISH

### 10.1 Qo'shimcha Funksiyalar (Ixtiyoriy)

**1. Referral Tizimi:**
- Har bir foydalanuvchi uchun unikal referal link
- Do'st obuna bo'lganda 10% chegirma
- Statistika: nechta do'st taklif qilgan

**2. Promo Kod:**
- Admin panel orqali promo kod yaratish
- Chegirma (% yoki fixed summa)
- Foydalanish limiti va muddati
- Statistika: nechta marta ishlatilgan

**3. Multi-Language:**
- O'zbek, Rus, Ingliz tillarini qo'llab-quvvatlash
- Foydalanuvchi tilini tanlash
- Admin panel orqali tarjimalarni boshqarish

**4. Payment Methods:**
- Click to'lov tizimi qo'shish
- Uzcard/Humo kartalar qo'llab-quvvatlash
- Cryptocurrency (optional)

**5. Analytics:**
- Google Analytics integratsiyasi
- Foydalanuvchi xatti-harakatlari tahlili
- Conversion funnel
- Retention rate

**6. Channel Preview:**
- Obuna bo'lishdan oldin kanal kontentini ko'rish
- Trial muddati (3 kun bepul)
- Demo kanal linkini ko'rsatish

**7. Subscription Management:**
- Obunani bekor qilish
- Obunani to'xtatib turish (pause)
- Avtomatik uzaytirish (auto-renewal)

**8. Customer Support:**
- Yordam bo'limi (FAQ)
- Support chat (admin bilan)
- Ticket tizimi

**9. Gamification:**
- Yutuqlar (achievements)
- Loyallik dasturi
- Bonus ballar

**10. Advanced Admin:**
- Foydalanuvchilarni bloklash/blokdan chiqarish
- Maxsus chegirmalar berish
- Obunani qo'lda uzaytirish
- Detallı hisobotlar (CSV/PDF export)

---

## ✅ ACCEPTANCE CRITERIA

### Minimal Viable Product (MVP):
1. ✅ Foydalanuvchi ro'yxatdan o'tishi mumkin
2. ✅ Kanallar ro'yxatini ko'rish mumkin
3. ✅ Payme orqali to'lov qilish mumkin
4. ✅ To'lovdan keyin kanalga avtomatik qo'shilish
5. ✅ Obunalarni ko'rish mumkin
6. ✅ Avtomatik bildirishnomalar ishlaydi (29, 30, 31, 32-kunlar)
7. ✅ Admin panel ishlaydi (statistika, kanallar, foydalanuvchilar, e'lon)
8. ✅ Excel export ishlaydi
9. ✅ Broadcast ishlaydi
10. ✅ Scheduler har kuni 09:00 da ishlaydi

### Production Ready:
11. ✅ Error handling barcha joylarda
12. ✅ Logging to'liq sozlangan
13. ✅ Rate limiting ishlaydi
14. ✅ Database migration mavjud
15. ✅ Docker deployment ready
16. ✅ README va dokumentatsiya to'liq
17. ✅ .env.example mavjud
18. ✅ PM2 ecosystem file mavjud
19. ✅ Backup strategy hujjatlashtirilgan
20. ✅ Security best practices qo'llanilgan

---

## 📞 SUPPORT

**Developer:** Bekmuhammad  
**GitHub:** [Bekmuhammad-Devoloper/money.bot](https://github.com/Bekmuhammad-Devoloper/money.bot)  
**Email:** support@puloqimi.uz (ixtiyoriy)  
**Telegram:** @puloqimibot  

---

**Sana:** 28.01.2026  
**Versiya:** 1.0.0  
**Status:** ✅ To'liq Tayyorlangan
