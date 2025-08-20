import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateWalletDto {
  @ApiProperty({ example: 'user-uuid', description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 0, description: 'Initial balance in Kwanza', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  initialBalance?: number;
}
