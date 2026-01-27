import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymeService } from './payme.service';
import { PaymeController } from './payme.controller';
import { Payment, Subscription, User, Channel } from '../database/entities';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Payment, Subscription, User, Channel]),
  ],
  controllers: [PaymeController],
  providers: [PaymeService],
  exports: [PaymeService],
})
export class PaymeModule {}
