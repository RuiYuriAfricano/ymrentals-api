import { Controller, Get, Post, Delete, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { LocationSearchDto } from './dto/location-search.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../user/jwt-auth.guard';

@ApiTags('Equipment')
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new equipment' })
  async create(@Body() createEquipmentDto: CreateEquipmentDto, @Request() req) {
    return this.equipmentService.create({ ...createEquipmentDto, ownerId: req.user.userId });
  }

  @Get()
  @ApiOperation({ summary: 'Get all available equipment' })
  async findAll(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('location') location?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('brands') brands?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    // Converter string de marcas separadas por vírgula em array
    const brandsArray = brands ? brands.split(',').map(b => b.trim()).filter(b => b) : undefined;

    return this.equipmentService.findAll({
      category,
      search,
      minPrice,
      maxPrice,
      location,
      page: page || 1,
      limit: limit || 10,
      brands: brandsArray,
      sortBy,
    });
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Get equipment by location and radius' })
  async findNearby(@Query() locationSearchDto: LocationSearchDto) {
    return this.equipmentService.findNearby(locationSearchDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get equipment by ID' })
  async findOne(@Param('id') id: string) {
    return this.equipmentService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update equipment' })
  async update(@Param('id') id: string, @Body() updateEquipmentDto: UpdateEquipmentDto, @Request() req) {
    return this.equipmentService.update(id, updateEquipmentDto, req.user.userId);
  }

  @Patch(':id/availability')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update equipment availability' })
  async updateAvailability(@Param('id') id: string, @Body('isAvailable') isAvailable: boolean, @Request() req) {
    return this.equipmentService.updateAvailability(id, isAvailable, req.user.userId);
  }

  @Get('user/my-equipment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user equipment' })
  async getMyEquipment(@Request() req) {
    return this.equipmentService.findByOwner(req.user.userId);
  }

  @Get('categories/list')
  @ApiOperation({ summary: 'Get all equipment categories' })
  async getCategories() {
    return this.equipmentService.getCategories();
  }

  @Get('brands/list')
  @ApiOperation({ summary: 'Get unique brands list' })
  async getBrands() {
    return this.equipmentService.getUniqueBrands();
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete equipment' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.equipmentService.softDelete(id, req.user.userId);
  }
}
