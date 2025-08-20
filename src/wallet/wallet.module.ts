import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { ProxyPayService } from './proxypay.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [WalletController],
  providers: [WalletService, ProxyPayService],
  exports: [WalletService, ProxyPayService],
})
export class WalletModule {}
