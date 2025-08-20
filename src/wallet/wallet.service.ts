import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProxyPayService, ProxyPayResponse } from './proxypay.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import {
  CreateWalletTransactionDto,
  ProxyPayDepositDto,
  ProxyPayWithdrawalDto,
  WalletTransactionType,
  WalletTransactionStatus
} from './dto/wallet-transaction.dto';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly proxyPayService: ProxyPayService
  ) {}

  // Criar carteira para um usuário
  async createWallet(createWalletDto: CreateWalletDto) {
    const { userId, initialBalance = 0 } = createWalletDto;

    // Verificar se o usuário existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verificar se já existe uma carteira para este usuário
    const existingWallet = await this.prisma.wallet.findUnique({
      where: { userId }
    });

    if (existingWallet) {
      throw new BadRequestException('User already has a wallet');
    }

    // Criar carteira
    const wallet = await this.prisma.wallet.create({
      data: {
        userId,
        balance: initialBalance,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          }
        }
      }
    });

    // Se há saldo inicial, criar transação
    if (initialBalance > 0) {
      await this.createTransaction({
        walletId: wallet.id,
        type: WalletTransactionType.DEPOSIT,
        amount: initialBalance,
        description: 'Saldo inicial da carteira',
        reference: `INITIAL_${wallet.id}`,
      });
    }

    return wallet;
  }

  // Buscar carteira por usuário
  async getWalletByUserId(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          }
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Últimas 10 transações
        }
      }
    });

    if (!wallet) {
      // Criar carteira automaticamente se não existir
      return this.createWallet({ userId });
    }

    return wallet;
  }

  // Criar transação
  async createTransaction(createTransactionDto: CreateWalletTransactionDto) {
    const { walletId, type, amount, description, reference, proxyPayReference, proxyPayId, metadata } = createTransactionDto;

    // Verificar se a carteira existe
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId }
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Para débitos, verificar se há saldo suficiente
    if (amount < 0 && wallet.balance + amount < 0) {
      throw new BadRequestException('Insufficient balance');
    }

    // Criar transação
    const transaction = await this.prisma.walletTransaction.create({
      data: {
        walletId,
        type,
        amount,
        description,
        reference,
        proxyPayReference,
        proxyPayId,
        metadata,
        status: WalletTransactionStatus.COMPLETED, // Por enquanto, marcar como completa
      }
    });

    // Atualizar saldo da carteira
    await this.prisma.wallet.update({
      where: { id: walletId },
      data: {
        balance: {
          increment: amount
        }
      }
    });

    return transaction;
  }

  // Depósito via ProxyPay
  async depositViaProxyPay(userId: string, depositDto: ProxyPayDepositDto) {
    const { amount, paymentMethod, phoneNumber } = depositDto;

    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // Buscar carteira do usuário
    const wallet = await this.getWalletByUserId(userId);

    // Buscar dados do usuário
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, email: true, phoneNumber: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Criar depósito via ProxyPay real
    const proxyPayResponse = await this.proxyPayService.createDeposit({
      amount,
      currency: 'AOA',
      description: `Depósito na carteira YMRentals - ${user.fullName}`,
      customer: {
        name: user.fullName,
        email: user.email,
        phone: phoneNumber || user.phoneNumber || ''
      },
      paymentMethod,
      callbackUrl: `${process.env.FRONTEND_URL}/wallet/callback`,
      returnUrl: `${process.env.FRONTEND_URL}/wallet/success`
    });

    if (!proxyPayResponse.success) {
      throw new BadRequestException(`ProxyPay deposit failed: ${proxyPayResponse.error}`);
    }

    // Criar transação na base de dados (status pendente)
    const transaction = await this.createTransaction({
      walletId: wallet.id,
      type: WalletTransactionType.DEPOSIT,
      amount,
      description: `Depósito via ProxyPay - ${paymentMethod}`,
      reference: proxyPayResponse.reference,
      proxyPayReference: proxyPayResponse.reference,
      proxyPayId: proxyPayResponse.transactionId,
      status: WalletTransactionStatus.PENDING,
      metadata: {
        gateway: 'proxypay',
        paymentMethod,
        phoneNumber: phoneNumber || user.phoneNumber,
        paymentUrl: proxyPayResponse.paymentUrl
      }
    });

    return {
      transaction,
      proxyPayData: proxyPayResponse,
      paymentUrl: proxyPayResponse.paymentUrl,
      currentBalance: wallet.balance
    };
  }

  // Saque via ProxyPay
  async withdrawViaProxyPay(userId: string, withdrawalDto: ProxyPayWithdrawalDto) {
    const { amount, withdrawalMethod, accountNumber, bankName } = withdrawalDto;

    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // Buscar carteira do usuário
    const wallet = await this.getWalletByUserId(userId);

    if (wallet.balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Simular integração com ProxyPay
    const proxyPayResponse = await this.simulateProxyPayWithdrawal({
      amount,
      withdrawalMethod,
      accountNumber,
      bankName,
      userId
    });

    // Criar transação
    const transaction = await this.createTransaction({
      walletId: wallet.id,
      type: WalletTransactionType.WITHDRAWAL,
      amount: -amount, // Negativo para débito
      description: `Saque via ProxyPay - ${withdrawalMethod}`,
      reference: proxyPayResponse.reference,
      proxyPayReference: proxyPayResponse.proxyPayReference,
      proxyPayId: proxyPayResponse.proxyPayId,
      metadata: {
        ...proxyPayResponse.metadata,
        gateway: 'proxypay',
        withdrawalMethod,
        accountNumber,
        bankName
      }
    });

    return {
      transaction,
      proxyPayData: proxyPayResponse,
      newBalance: wallet.balance - amount
    };
  }

  // Buscar transações da carteira
  async getWalletTransactions(userId: string, page: number = 1, limit: number = 20) {
    const wallet = await this.getWalletByUserId(userId);

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.walletTransaction.count({
        where: { walletId: wallet.id }
      })
    ]);

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      wallet: {
        id: wallet.id,
        balance: wallet.balance,
        isActive: wallet.isActive
      }
    };
  }

  // Simulação da integração com ProxyPay para depósito
  private async simulateProxyPayDeposit(data: any) {
    // Esta função será substituída pela integração real com ProxyPay
    const reference = `DEP_${Date.now()}`;
    const proxyPayReference = `PP_DEP_${Math.random().toString(36).substr(2, 9)}`;
    const proxyPayId = `PP_ID_${Math.random().toString(36).substr(2, 12)}`;

    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      reference,
      proxyPayReference,
      proxyPayId,
      status: 'completed',
      metadata: {
        processedAt: new Date().toISOString(),
        gateway: 'proxypay',
        environment: 'sandbox' // ou 'production'
      }
    };
  }

  // Simulação da integração com ProxyPay para saque
  private async simulateProxyPayWithdrawal(data: any) {
    // Esta função será substituída pela integração real com ProxyPay
    const reference = `WIT_${Date.now()}`;
    const proxyPayReference = `PP_WIT_${Math.random().toString(36).substr(2, 9)}`;
    const proxyPayId = `PP_ID_${Math.random().toString(36).substr(2, 12)}`;

    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      success: true,
      reference,
      proxyPayReference,
      proxyPayId,
      status: 'completed',
      metadata: {
        processedAt: new Date().toISOString(),
        gateway: 'proxypay',
        environment: 'sandbox' // ou 'production'
      }
    };
  }
}
