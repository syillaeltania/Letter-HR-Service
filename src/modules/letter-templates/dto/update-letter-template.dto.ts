import { PartialType } from '@nestjs/swagger';
import { CreateLetterTemplateDto } from './create-letter-template.dto';

export class UpdateLetterTemplateDto extends PartialType(CreateLetterTemplateDto) {}
