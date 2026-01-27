import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User, Channel, Plan, Subscription, Payment, Broadcast } from '../database/entities';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, Channel, Plan, Subscription, Payment, Broadcast]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
