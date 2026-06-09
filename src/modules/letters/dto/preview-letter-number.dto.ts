import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsUUID } from 'class-validator';

export class PreviewLetterNumberDto {
  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  letterTypeId?: string;

  @ApiProperty({ required: false, example: { letter_sequence: '006' } })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}
