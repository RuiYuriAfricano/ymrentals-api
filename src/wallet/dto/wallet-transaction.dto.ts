import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, IsObject } from 'class-validator';

export enum WalletTransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  PRIORITY_FEE = 'PRIORITY_FEE',
  PROMOTION_FEE = 'PROMOTION_FEE',
  COMMISSION = 'COMMISSION',
  BONUS = 'BONUS',
}

export enum WalletTransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export class CreateWalletTransactionDto {
  @ApiProperty({ example: 'wallet-uuid', description: 'Wallet ID' })
  @IsString()
  walletId: string;

  @ApiProperty({ 
    example: 'DEPOSIT', 
    enum: WalletTransactionType,
    description: 'Transaction type' 
  })
  @IsEnum(WalletTransactionType)
  type: WalletTransactionType;

  @ApiProperty({ example: 50000, description: 'Amount in Kwanza (positive for credit, negative for debit)' })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'Depósito via ProxyPay', description: 'Transaction description' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'REF123456', description: 'External reference', required: false })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ example: 'PP123456', description: 'ProxyPay reference', required: false })
  @IsOptional()
  @IsString()
  proxyPayReference?: string;

  @ApiProperty({ example: 'PP_ID_123', description: 'ProxyPay transaction ID', required: false })
  @IsOptional()
  @IsString()
  proxyPayId?: string;

  @ApiProperty({
    example: 'PENDING',
    enum: WalletTransactionStatus,
    description: 'Transaction status',
    required: false
  })
  @IsOptional()
  @IsEnum(WalletTransactionStatus)
  status?: WalletTransactionStatus;

  @ApiProperty({
    example: { gateway: 'proxypay', method: 'bank_transfer' },
    description: 'Additional metadata',
    required: false
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class ProxyPayDepositDto {
  @ApiProperty({ example: 50000, description: 'Amount to deposit in Kwanza' })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'bank_transfer', description: 'Payment method' })
  @IsString()
  paymentMethod: string;

  @ApiProperty({ example: '+244999999999', description: 'Phone number for mobile payments', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}

export class ProxyPayWithdrawalDto {
  @ApiProperty({ example: 25000, description: 'Amount to withdraw in Kwanza' })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'bank_transfer', description: 'Withdrawal method' })
  @IsString()
  withdrawalMethod: string;

  @ApiProperty({ example: '0000000000000000', description: 'Bank account or IBAN' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ example: 'Banco BAI', description: 'Bank name', required: false })
  @IsOptional()
  @IsString()
  bankName?: string;
}
