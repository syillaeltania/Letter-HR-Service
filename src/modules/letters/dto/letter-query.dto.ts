import { LetterStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class LetterQueryDto {
  @IsOptional()
  @IsEnum(LetterStatus)
  status?: LetterStatus;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  letterTypeId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
