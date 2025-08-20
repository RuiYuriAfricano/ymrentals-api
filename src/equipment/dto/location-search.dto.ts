import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class LocationSearchDto {
  @ApiProperty({ 
    example: -8.8390, 
    description: 'Latitude da localização de busca',
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({ 
    example: 13.2894, 
    description: 'Longitude da localização de busca',
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({ 
    example: 10, 
    description: 'Raio de busca em quilômetros',
    required: false,
    default: 10
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0.1)
  @Max(1000)
  radius?: number = 10;

  @ApiProperty({ 
    example: 'Construção', 
    description: 'Categoria do equipamento',
    required: false 
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ 
    example: 'escavadeira', 
    description: 'Termo de busca',
    required: false 
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ 
    example: 100, 
    description: 'Preço mínimo',
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minPrice?: number;

  @ApiProperty({ 
    example: 1000, 
    description: 'Preço máximo',
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  maxPrice?: number;

  @ApiProperty({ 
    example: 1, 
    description: 'Página atual',
    required: false,
    default: 1
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    example: 10,
    description: 'Número de itens por página',
    required: false,
    default: 10
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    example: ['Caterpillar', 'Komatsu'],
    description: 'Lista de marcas para filtrar',
    required: false
  })
  @IsOptional()
  brands?: string[];
}
