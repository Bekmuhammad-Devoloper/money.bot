import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  User,
  Channel,
  Plan,
  Subscription,
  Payment,
  Notification,
  Broadcast,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [User, Channel, Plan, Subscription, Payment, Notification, Broadcast],
        synchronize: true,
        logging: configService.get<string>('app.nodeEnv') === 'development',
        autoLoadEntities: true,
      }),
    }),
    TypeOrmModule.forFeature([
      User,
      Channel,
      Plan,
      Subscription,
      Payment,
      Notification,
      Broadcast,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
