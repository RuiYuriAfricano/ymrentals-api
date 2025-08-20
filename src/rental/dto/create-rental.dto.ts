import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDateString, IsOptional, IsEnum, IsInt, Min, Max, Validate, IsBoolean } from 'class-validator';
import { IsValidDateRange } from '../../cart/validators/date-range.validator';

export class CreateRentalDto {
  @ApiProperty({ example: '2024-03-01', description: 'Rental start date', type: String, format: 'date' })
  @IsDateString()
  @Validate(IsValidDateRange, { message: 'Invalid start date' })
  startDate!: string;

  @ApiProperty({ example: '2024-03-05', description: 'Rental end date', type: 'string', format: 'date' })
  @IsDateString()
  @Validate(IsValidDateRange, { message: 'Invalid end date' })
  endDate!: string;

  @ApiProperty({ example: '09:00', description: 'Start time (HH:mm format)', required: false })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiProperty({ example: '17:00', description: 'End time (HH:mm format)', required: false })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiProperty({ example: 250.0, description: 'Total rental amount', type: Number })
  @IsNumber()
  totalAmount!: number;

  @ApiProperty({ example: 50.0, description: 'Daily rate', type: Number, required: false })
  @IsOptional()
  @IsNumber()
  dailyRate?: number;

  @ApiProperty({ example: 'DAILY', description: 'Price period', enum: ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY'], required: false })
  @IsOptional()
  @IsEnum(['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY'])
  pricePeriod?: string;

  @ApiProperty({ example: 30, description: 'Maximum rental days allowed', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  maxRentalDays?: number;

  @ApiProperty({ example: 'RECEIPT', description: 'Payment method', enum: ['REFERENCE', 'RECEIPT', 'WALLET'] })
  @IsEnum(['REFERENCE', 'RECEIPT', 'WALLET'])
  paymentMethod!: string;

  @ApiProperty({ example: 'REF123456789', description: 'Payment reference (for REFERENCE method)', required: false })
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiProperty({ example: 'uuid-equipment-id', description: 'Rented equipment ID' })
  @IsString()
  equipmentId!: string;

  @ApiProperty({ example: -8.8390, description: 'Renter latitude at request time', required: false })
  @IsOptional()
  @IsNumber()
  renterLatitude?: number;

  @ApiProperty({ example: 13.2894, description: 'Renter longitude at request time', required: false })
  @IsOptional()
  @IsNumber()
  renterLongitude?: number;

  @ApiProperty({ example: 'Rua da Independência, 123, Maianga, Luanda', description: 'Renter formatted address', required: false })
  @IsOptional()
  @IsString()
  renterAddress?: string;

  @ApiProperty({ example: false, description: 'Whether to pay priority fee', required: false })
  @IsOptional()
  @IsBoolean()
  hasPriority?: boolean;

  @ApiProperty({ example: 5000, description: 'Priority fee amount in AOA', required: false })
  @IsOptional()
  @IsNumber()
  priorityAmount?: number;
}
