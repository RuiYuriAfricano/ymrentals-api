import { Module } from '@nestjs/common';
import { RentalService } from './rental.service';
import { RentalController } from './rental.controller';
import { RentalCronService } from './rental.cron';
import { PrismaService } from '../prisma/prisma.service';

import { EmailModule } from '../email/email.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [EmailModule, WalletModule],
  controllers: [RentalController],
  providers: [RentalService, RentalCronService, PrismaService],
  exports: [RentalService],
})
export class RentalModule {}
