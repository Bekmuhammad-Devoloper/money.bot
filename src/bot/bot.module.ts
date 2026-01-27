import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import {
  User,
  Channel,
  Subscription,
  Payment,
  Notification,
  Broadcast,
} from '../database/entities';

// Modules
import { PaymeModule } from '../payme';

// Services
import { UserService, ChannelService, ExcelService, BroadcastService } from './services';

// Handlers
import { UserUpdateHandler, AdminUpdateHandler } from './handlers';

// Scheduler
import { NotificationSchedulerService } from './scheduler';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    PaymeModule,
    TypeOrmModule.forFeature([
      User,
      Channel,
      Subscription,
      Payment,
      Notification,
      Broadcast,
    ]),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get<string>('app.nodeEnv') === 'production';
        const webhookDomain = configService.get<string>('app.url');
        
        return {
          token: configService.get<string>('telegram.botToken') || '',
          launchOptions: isProduction && webhookDomain
            ? {
                webhook: {
                  domain: webhookDomain,
                  hookPath: '/telegram-webhook',
                },
              }
            : {},
        };
      },
    }),
  ],
  providers: [
    // Services
    UserService,
    ChannelService,
    ExcelService,
    BroadcastService,
    
    // Handlers
    UserUpdateHandler,
    AdminUpdateHandler,
    
    // Scheduler
    NotificationSchedulerService,
  ],
  exports: [
    UserService,
    ChannelService,
    BroadcastService,
    NotificationSchedulerService,
  ],
})
export class BotModule {}
