import { PartialType } from '@nestjs/swagger';
import { CreateLetterCategoryDto } from './create-letter-category.dto';

export class UpdateLetterCategoryDto extends PartialType(CreateLetterCategoryDto) {}
