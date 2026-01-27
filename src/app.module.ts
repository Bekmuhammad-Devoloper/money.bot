import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// Configuration
import {
  appConfig,
  databaseConfig,
  redisConfig,
  telegramConfig,
  paymeConfig,
  schedulerConfig,
} from './config';

// Modules
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis';
import { PaymeModule } from './payme';
import { BotModule } from './bot';
import { AdminModule } from './admin';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        telegramConfig,
        paymeConfig,
        schedulerConfig,
      ],
      envFilePath: ['.env.local', '.env'],
    }),

    // Schedule
    ScheduleModule.forRoot(),

    // Database
    DatabaseModule,

    // Redis
    RedisModule,

    // Payme
    PaymeModule,

    // Admin Web App
    AdminModule,

    // Serve static files for Web App
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
    }),

    // Bot
    BotModule,
  ],
})
export class AppModule {}
