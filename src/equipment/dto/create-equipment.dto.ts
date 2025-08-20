import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsArray,
  IsOptional,
  IsObject,
  IsEnum,
} from 'class-validator';

export enum PricePeriod {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export class CreateEquipmentDto {
  @ApiProperty({ example: 'DJI Mavic Pro', description: 'Equipment name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Professional drone for photography', description: 'Equipment description' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'Drones', description: 'Equipment category' })
  @IsString()
  category: string;

  @ApiProperty({ example: 'Caterpillar', description: 'Equipment brand', required: false })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ example: 'CAT 320', description: 'Equipment model', required: false })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ example: 50.0, description: 'Rental price', required: false })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({
    example: 'DAILY',
    enum: PricePeriod,
    description: 'Rental price period (optional)',
    required: false,
  })
  @IsOptional()
  @IsEnum(PricePeriod)
  pricePeriod?: PricePeriod;

  @ApiProperty({ example: 1000.0, description: 'Sale price of the equipment', required: false })
  @IsOptional()
  @IsNumber()
  salePrice?: number;

  @ApiProperty({
    example: ['base64image1...', 'base64image2...'],
    description: 'Base64-encoded images',
  })
  @IsArray()
  @IsString({ each: true })
  images: string[];

  @ApiProperty({
    example: ['base64video1...', 'base64video2...'],
    description: 'Base64-encoded videos',
  })
  @IsArray()
  @IsString({ each: true })
  videos: string[];

  @ApiProperty({ example: true, description: 'Availability status' })
  @IsBoolean()
  isAvailable: boolean;

  @ApiProperty({ example: 'uuid-owner-id', description: 'Owner user ID' })
  @IsString()
  ownerId: string;

  @ApiProperty({
    example: {
      Potência: '2000W',
      Cor: 'Vermelha',
      Peso: '15kg',
    },
    description: 'Dynamic equipment specifications (key-value pairs)',
  })
  @IsOptional()
  @IsObject()
  specifications?: Record<string, string>;

  @ApiProperty({ example: 'uuid-address-id', description: 'Address ID (optional)', required: false })
  @IsOptional()
  @IsString()
  addressId?: string;

  @ApiProperty({
    example: ['data:application/pdf;base64,JVBERi0xLjcKJYGBgYEK...', 'data:image/png;base64,...'],
    description: 'Array of base64 encoded documents (optional)',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];
}
