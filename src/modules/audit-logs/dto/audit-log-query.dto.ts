import { IsOptional, IsString } from 'class-validator';

export class AuditLogQueryDto {
  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
