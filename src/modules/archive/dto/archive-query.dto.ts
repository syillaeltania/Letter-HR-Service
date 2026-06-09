import { LetterStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class ArchiveQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(LetterStatus)
  status?: LetterStatus;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
