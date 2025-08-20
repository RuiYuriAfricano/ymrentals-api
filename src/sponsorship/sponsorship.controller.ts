import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../user/jwt-auth.guard';
import { SponsorshipService, CreateSponsorshipDto } from './sponsorship.service';

@ApiTags('Sponsorship')
@Controller('sponsorship')
export class SponsorshipController {
  constructor(private readonly sponsorshipService: SponsorshipService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new ad sponsorship' })
  async create(@Body() createSponsorshipDto: CreateSponsorshipDto, @Request() req) {
    return this.sponsorshipService.createSponsorship(req.user.userId, createSponsorshipDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all sponsorships' })
  @ApiQuery({ name: 'sponsorId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Query('sponsorId') sponsorId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Request() req?
  ) {
    return this.sponsorshipService.findAll({
      sponsorId: sponsorId || req.user.userId,
      status,
      page,
      limit
    });
  }

  @Get('my-sponsorships')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user sponsorships' })
  async getMySponsorships(@Request() req) {
    return this.sponsorshipService.findAll({
      sponsorId: req.user.userId
    });
  }

  @Get('sponsored-ads')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sponsored ads for current user' })
  async getSponsoredAds(@Request() req) {
    return this.sponsorshipService.getSponsoredAdsForUser(req.user.userId);
  }

  @Get('can-create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user can create new sponsorship' })
  async canCreateNewSponsorship(@Request() req) {
    return this.sponsorshipService.canCreateNewSponsorship(req.user.userId);
  }

  @Get('sponsored-equipments')
  @ApiOperation({ summary: 'Get sponsored equipments for listings' })
  @ApiQuery({ name: 'limit', required: false })
  async getSponsoredEquipments(@Query('limit') limit?: number) {
    return this.sponsorshipService.getSponsoredEquipments(limit ? Number(limit) : 10);
  }

  @Get('equipment/:id/is-sponsored')
  @ApiOperation({ summary: 'Check if equipment is sponsored' })
  async isEquipmentSponsored(@Param('id') id: string) {
    const isSponsored = await this.sponsorshipService.isEquipmentSponsored(id);
    return { isSponsored };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a sponsorship by ID' })
  async findOne(@Param('id') id: string) {
    return this.sponsorshipService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update sponsorship status' })
  async updateStatus(@Param('id') id: string, @Body('status') status: string, @Request() req) {
    return this.sponsorshipService.updateStatus(id, status, req.user.userId);
  }

  @Post(':id/impression')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Increment sponsorship impression count' })
  async incrementImpression(@Param('id') id: string) {
    return this.sponsorshipService.incrementImpression(id);
  }

  @Post(':id/click')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Increment sponsorship click count' })
  async incrementClick(@Param('id') id: string) {
    return this.sponsorshipService.incrementClick(id);
  }



  @Post(':id/extend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Extend existing sponsorship' })
  async extendSponsorship(
    @Param('id') id: string,
    @Body() extendData: { additionalDays: number; additionalAmount: number },
    @Request() req
  ) {
    return this.sponsorshipService.extendSponsorship(
      req.user.userId,
      id,
      extendData.additionalDays,
      extendData.additionalAmount
    );
  }

}
