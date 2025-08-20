import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { ProxyPayService } from './proxypay.service';
import { JwtAuthGuard } from '../user/jwt-auth.guard';
import {
  CreateWalletDto,
} from './dto/create-wallet.dto';
import {
  CreateWalletTransactionDto,
  ProxyPayDepositDto,
  ProxyPayWithdrawalDto
} from './dto/wallet-transaction.dto';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly proxyPayService: ProxyPayService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create wallet for user' })
  @ApiResponse({ status: 201, description: 'Wallet created successfully' })
  @ApiResponse({ status: 400, description: 'User already has a wallet' })
  async createWallet(@Body() createWalletDto: CreateWalletDto, @Request() req) {
    // Admin pode criar carteira para qualquer usuário, usuário comum apenas para si
    if (req.user.role !== 'ADMIN' && createWalletDto.userId !== req.user.userId) {
      createWalletDto.userId = req.user.userId;
    }
    
    return this.walletService.createWallet(createWalletDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user wallet' })
  @ApiResponse({ status: 200, description: 'Wallet retrieved successfully' })
  async getWallet(@Request() req) {
    return this.walletService.getWalletByUserId(req.user.userId);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wallet transactions' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async getTransactions(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    return this.walletService.getWalletTransactions(
      req.user.userId,
      parseInt(page),
      parseInt(limit)
    );
  }

  @Post('deposit/proxypay')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deposit money via ProxyPay' })
  @ApiResponse({ status: 200, description: 'Deposit processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid deposit data' })
  async depositViaProxyPay(@Body() depositDto: ProxyPayDepositDto, @Request() req) {
    return this.walletService.depositViaProxyPay(req.user.userId, depositDto);
  }

  @Post('withdraw/proxypay')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw money via ProxyPay' })
  @ApiResponse({ status: 200, description: 'Withdrawal processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid withdrawal data or insufficient balance' })
  async withdrawViaProxyPay(@Body() withdrawalDto: ProxyPayWithdrawalDto, @Request() req) {
    return this.walletService.withdrawViaProxyPay(req.user.userId, withdrawalDto);
  }

  @Post('transaction')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create manual transaction (Admin only)' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async createTransaction(@Body() createTransactionDto: CreateWalletTransactionDto, @Request() req) {
    // Apenas admins podem criar transações manuais
    if (req.user.role !== 'ADMIN') {
      throw new Error('Only admins can create manual transactions');
    }

    return this.walletService.createTransaction(createTransactionDto);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wallet by user ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Wallet retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getWalletByUserId(@Param('userId') userId: string, @Request() req) {
    // Apenas admins podem ver carteiras de outros usuários
    if (req.user.role !== 'ADMIN') {
      throw new Error('Only admins can view other users wallets');
    }

    return this.walletService.getWalletByUserId(userId);
  }

  @Get('user/:userId/transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transactions by user ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getTransactionsByUserId(
    @Param('userId') userId: string,
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    // Apenas admins podem ver transações de outros usuários
    if (req.user.role !== 'ADMIN') {
      throw new Error('Only admins can view other users transactions');
    }

    return this.walletService.getWalletTransactions(
      userId,
      parseInt(page),
      parseInt(limit)
    );
  }

  @Post('webhook/proxypay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ProxyPay webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleProxyPayWebhook(@Body() payload: any) {
    try {
      this.logger.log('Received ProxyPay webhook', payload);
      await this.proxyPayService.handleWebhook(payload);
      return { success: true, message: 'Webhook processed successfully' };
    } catch (error) {
      this.logger.error('Webhook processing failed', error);
      return { success: false, error: error.message };
    }
  }
}
