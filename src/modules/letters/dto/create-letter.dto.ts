import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsUUID } from 'class-validator';

export class CreateLetterDto {
  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  letterTypeId?: string;

  @ApiProperty()
  @IsUUID()
  templateId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  approverId?: string;

  @ApiProperty({ example: { employee_name: 'Jane Doe', position: 'HR Officer' } })
  @IsObject()
  content: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  htmlContent?: string;
}
