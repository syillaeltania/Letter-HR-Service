import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class ValidateSequenceDto {
  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  letterTypeId?: string;

  @ApiProperty({ example: '2026-07-07' })
  @IsDateString()
  letterDate: string;

  @ApiProperty({ example: 78 })
  @IsNotEmpty()
  sequenceNumber: number | string;
}
