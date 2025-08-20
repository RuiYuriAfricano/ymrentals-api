import { Controller, Get, Post, Delete, Patch, Param, Body, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { RentalService } from './rental.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { UpdateRentalDto } from './dto/update-rental.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../user/jwt-auth.guard';

@ApiTags('Rentals')
@Controller('rentals')
export class RentalController {
  constructor(private readonly rentalService: RentalService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new rental' })
  async create(@Body() createRentalDto: CreateRentalDto, @Request() req) {
    return this.rentalService.create({ ...createRentalDto, renterId: req.user.userId });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all rentals' })
  async findAll(
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('equipmentId') equipmentId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Request() req?
  ) {
    return this.rentalService.findAll({
      status,
      userId: userId || req.user.userId,
      equipmentId,
      page: page || 1,
      limit: limit || 10,
    });
  }

  @Get('my-rentals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user rentals' })
  async getMyRentals(@Request() req, @Query('type') type?: 'renter' | 'owner') {
    return this.rentalService.getUserRentals(req.user.userId, type);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get rental history' })
  async getHistory(@Request() req) {
    return this.rentalService.getRentalHistory(req.user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a rental by ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.rentalService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update rental status' })
  async update(@Param('id') id: string, @Body() updateRentalDto: UpdateRentalDto, @Request() req) {
    return this.rentalService.update(id, updateRentalDto, req.user.userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update rental status' })
  async updateStatus(@Param('id') id: string, @Body('status') status: string, @Request() req) {
    return this.rentalService.updateStatus(id, status, req.user.userId);
  }

  @Post(':id/payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process rental payment' })
  async processPayment(@Param('id') id: string, @Body() paymentData: any, @Request() req) {
    return this.rentalService.processPayment(id, paymentData, req.user.userId);
  }

  @Post(':id/payment-receipt')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload payment receipt' })
  async uploadPaymentReceipt(
    @Param('id') id: string,
    @Body() receiptData: { paymentReceipt: string; paymentMethod: string },
    @Request() req
  ) {
    return this.rentalService.uploadPaymentReceipt(id, receiptData.paymentReceipt, req.user.userId);
  }

  @Post(':id/pay-with-wallet')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pay rental with digital wallet' })
  async payWithWallet(@Param('id') id: string, @Request() req) {
    return this.rentalService.payWithWallet(id, req.user.userId);
  }

  @Patch(':id/validate-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate payment receipt (Moderator only)' })
  async validatePaymentReceipt(
    @Param('id') id: string,
    @Body('isApproved') isApproved: boolean,
    @Body('rejectionReason') rejectionReason: string,
    @Request() req
  ) {
    // Verificar se o usuário é moderador
    if (!['MODERATOR', 'MANAGER', 'ADMIN'].includes(req.user.role)) {
      throw new ForbiddenException('Only moderators can validate payment receipts');
    }

    return this.rentalService.validatePaymentReceipt(id, isApproved, req.user.userId, rejectionReason);
  }

  @Get('pending-receipts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending payment receipts (Moderator only)' })
  async getPendingPaymentReceipts(@Request() req) {
    // Verificar se o usuário é moderador
    if (!['MODERATOR', 'MANAGER', 'ADMIN'].includes(req.user.role)) {
      throw new ForbiddenException('Only moderators can view pending payment receipts');
    }

    return this.rentalService.getPendingPaymentReceipts();
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a rental' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.rentalService.cancelRental(id, req.user.userId);
  }
}
