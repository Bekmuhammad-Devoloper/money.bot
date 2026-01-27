# PulOqimi Bot - Telegram Subscription Management System

A comprehensive Telegram bot for managing paid channel subscriptions with admin dashboard, Payme payment integration, and automated notification system.

## 🌟 Features

### User Features
- 📝 User registration with full name and phone number
- 📺 Browse available subscription channels
- 💳 Payme payment integration for Uzbekistan
- 🔗 One-time invite links after successful payment
- 📋 View active subscriptions

### Admin Features
- 📊 Statistics dashboard (users, revenue, expiring subscriptions)
- 📺 Channel management (add, edit, delete, toggle status)
- 👥 User management with export to Excel
- 📢 Broadcast messages to all users (text, photo, video)

### Automated Features
- ⏰ Daily subscription expiry checks
- 📨 Notification system:
  - Day 29: First warning (expires tomorrow)
  - Day 30: Second warning (expires today)
  - Day 31: Final warning
  - Day 32: Automatic removal from channel
- 🔄 User removal from channels on expiration

## 🛠 Tech Stack

- **Backend**: NestJS (Node.js)
- **Database**: PostgreSQL
- **Cache/Session**: Redis
- **Bot Framework**: Telegraf (nestjs-telegraf)
- **Payment**: Payme Merchant API
- **Scheduler**: @nestjs/schedule
- **Excel Export**: ExcelJS

## 📋 Prerequisites

- Node.js 18+ or 20+
- PostgreSQL 14+
- Redis 7+
- Telegram Bot Token (from @BotFather)
- Payme Merchant Account

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd PulOqimiBot
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Telegram Bot
BOT_TOKEN=your_bot_token_here
ADMIN_IDS=123456789,987654321

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=puloqimi_bot

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Payme
PAYME_MERCHANT_ID=your_merchant_id
PAYME_SECRET_KEY=your_secret_key
PAYME_TEST_SECRET_KEY=your_test_secret_key

# Application
APP_PORT=3000
APP_URL=https://your-domain.com
```

### 3. Start PostgreSQL and Redis

Using Docker:

```bash
docker-compose up -d postgres redis
```

Or manually install and configure PostgreSQL and Redis.

### 4. Run the Application

Development mode:

```bash
npm run start:dev
```

Production mode:

```bash
npm run build
npm run start:prod
```

## 🐳 Docker Deployment

### Full Docker Deployment

```bash
docker-compose up -d
```

This starts:
- PostgreSQL database
- Redis cache
- NestJS application

### Build Docker Image Only

```bash
docker build -t puloqimi-bot .
```

## 📁 Project Structure

```
src/
├── config/                 # Configuration files
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── redis.config.ts
│   ├── telegram.config.ts
│   ├── payme.config.ts
│   └── scheduler.config.ts
├── database/               # Database module
│   ├── entities/           # TypeORM entities
│   │   ├── user.entity.ts
│   │   ├── channel.entity.ts
│   │   ├── subscription.entity.ts
│   │   ├── payment.entity.ts
│   │   ├── notification.entity.ts
│   │   └── broadcast.entity.ts
│   ├── database.module.ts
│   └── data-source.ts
├── redis/                  # Redis module
│   ├── redis.module.ts
│   └── redis.service.ts
├── payme/                  # Payme integration
│   ├── payme.module.ts
│   ├── payme.service.ts
│   └── payme.controller.ts
├── bot/                    # Telegram bot module
│   ├── constants/          # Messages and states
│   │   ├── messages.ts
│   │   └── states.ts
│   ├── keyboards/          # Inline and reply keyboards
│   │   ├── user.keyboards.ts
│   │   └── admin.keyboards.ts
│   ├── services/           # Business logic
│   │   ├── user.service.ts
│   │   ├── channel.service.ts
│   │   ├── excel.service.ts
│   │   └── broadcast.service.ts
│   ├── handlers/           # Update handlers
│   │   ├── user.update.ts
│   │   └── admin.update.ts
│   ├── scheduler/          # Scheduled tasks
│   │   └── notification.scheduler.ts
│   └── bot.module.ts
├── app.module.ts           # Main module
└── main.ts                 # Entry point
```

## 💳 Payme Integration

### Setup

1. Register at [Payme Business](https://business.payme.uz)
2. Create a merchant account
3. Configure callback URL: `https://your-domain.com/payme`
4. Copy Merchant ID and Secret Key to `.env`

### Callback Endpoint

The bot exposes `/payme` endpoint for Payme callbacks. Ensure this URL is:
- Accessible from the internet
- Using HTTPS in production
- Configured in Payme merchant settings

### Supported Methods

- `CheckPerformTransaction` - Verify order exists
- `CreateTransaction` - Create payment transaction
- `PerformTransaction` - Complete payment
- `CancelTransaction` - Cancel/refund
- `CheckTransaction` - Get transaction status
- `GetStatement` - Get transactions list

## 👨‍💼 Admin Commands

| Command | Description |
|---------|-------------|
| `/admin` | Open admin panel |

### Admin Panel Features

1. **📊 Statistics**
   - Total users count
   - Active subscriptions
   - Expiring today
   - Today's and monthly revenue

2. **📺 Channels**
   - Add new channel
   - Edit channel (name, price, duration)
   - Toggle active/inactive
   - Delete channel

3. **👥 Users**
   - Subscribed users list
   - Interested users (registered, no subscription)
   - Export to Excel

4. **📢 Broadcast**
   - Send text message
   - Send photo with caption
   - Send video with caption

## 📨 Notification Schedule

| Day | Event | Action |
|-----|-------|--------|
| 29 | 1 day before expiry | "Obunangiz ertaga tugaydi" |
| 30 | Expiry day | "Bugun oxirgi kun" |
| 31 | 1 day after expiry | Final warning |
| 32 | 2 days after expiry | Remove from channel |

Notifications run daily at 9:00 AM (configurable).

## 🔒 Security

- Phone number validation
- Admin authentication via Telegram ID
- Rate limiting for commands
- Payme signature verification
- Environment variables for secrets
- CORS enabled
- Input validation

## 📊 Database Schema

### Users
- `id` (UUID, PK)
- `telegramId` (BIGINT, unique)
- `username` (VARCHAR)
- `fullName` (VARCHAR)
- `phoneNumber` (VARCHAR)
- `status` (ENUM: registered, active, expired, removed)
- `isBlocked` (BOOLEAN)
- `createdAt`, `updatedAt`

### Channels
- `id` (UUID, PK)
- `name` (VARCHAR)
- `description` (VARCHAR)
- `telegramChannelId` (BIGINT)
- `price` (DECIMAL)
- `durationDays` (INT)
- `isActive` (BOOLEAN)
- `sortOrder` (INT)

### Subscriptions
- `id` (UUID, PK)
- `userId` (UUID, FK)
- `channelId` (UUID, FK)
- `startDate`, `endDate` (TIMESTAMP)
- `status` (ENUM)
- `inviteLink` (VARCHAR)
- `inviteLinkUsed`, `userJoined`, `userRemoved` (BOOLEAN)
- `notificationsSent` (INT)

### Payments
- `id` (UUID, PK)
- `userId` (UUID, FK)
- `orderId` (VARCHAR, unique)
- `amount` (DECIMAL)
- `status` (ENUM)
- `paymeTransactionId` (VARCHAR)
- `performTime`, `cancelTime` (TIMESTAMP)

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payme` | Payme callback handler |

## 🌐 Webhook vs Polling

### Development (Polling)
The bot uses long polling by default in development.

### Production (Webhook)
Set `APP_URL` to enable webhook mode:
- Webhook path: `/telegram-webhook`
- Requires HTTPS

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `BOT_TOKEN` | Telegram bot token | ✅ |
| `ADMIN_IDS` | Comma-separated admin IDs | ✅ |
| `DB_HOST` | PostgreSQL host | ✅ |
| `DB_PORT` | PostgreSQL port | ✅ |
| `DB_USERNAME` | PostgreSQL username | ✅ |
| `DB_PASSWORD` | PostgreSQL password | ✅ |
| `DB_DATABASE` | PostgreSQL database name | ✅ |
| `REDIS_HOST` | Redis host | ✅ |
| `REDIS_PORT` | Redis port | ✅ |
| `REDIS_PASSWORD` | Redis password | ❌ |
| `PAYME_MERCHANT_ID` | Payme merchant ID | ✅ |
| `PAYME_SECRET_KEY` | Payme secret key | ✅ |
| `PAYME_TEST_SECRET_KEY` | Payme test secret key | ❌ |
| `APP_PORT` | Application port | ❌ (default: 3000) |
| `APP_URL` | Application URL (for webhook) | ❌ |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, create an issue in the repository or contact the maintainers.

---

Made with ❤️ for Uzbekistan 🇺🇿
