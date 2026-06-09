import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class NextSequenceQueryDto {
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
}
