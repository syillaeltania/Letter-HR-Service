import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLetterTypeDto {
  @ApiProperty({ example: 'Surat Keputusan berkaitan dengan peraturan/kebijakan' })
  @IsString()
  @MaxLength(180)
  typeName: string;

  @ApiProperty({ example: 'SK.01' })
  @IsString()
  @MaxLength(30)
  typeCode: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
