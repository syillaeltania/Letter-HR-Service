import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLetterCategoryDto {
  @ApiProperty({ example: 'Surat Keterangan Kerja' })
  @IsString()
  @MaxLength(120)
  categoryName: string;

  @ApiProperty({ example: 'SKK' })
  @IsString()
  @MaxLength(20)
  categoryCode: string;

  @ApiProperty({ required: false, example: 'Kategori surat keputusan HR dan HCM' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '{{sequence}}/HCM/{{type_code}}/{{roman_month}}/{{year}}' })
  @IsString()
  numberingFormat: string;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
