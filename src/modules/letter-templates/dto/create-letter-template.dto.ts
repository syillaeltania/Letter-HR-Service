import { ApiProperty } from '@nestjs/swagger';
import { TemplateStatus } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateLetterTemplateDto {
  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  letterTypeId?: string;

  @ApiProperty()
  @IsString()
  templateName: string;

  @ApiProperty({ example: 'Dear {{employee_name}}, your letter number is {{letter_number}}.' })
  @IsString()
  templateContent: string;

  @ApiProperty({ example: ['employee_name', 'letter_number'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  placeholders?: string[];

  @ApiProperty({ enum: TemplateStatus, default: TemplateStatus.DRAFT })
  @IsOptional()
  @IsEnum(TemplateStatus)
  status?: TemplateStatus;
}
