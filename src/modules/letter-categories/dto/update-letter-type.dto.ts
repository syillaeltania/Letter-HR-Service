import { PartialType } from '@nestjs/swagger';
import { CreateLetterTypeDto } from './create-letter-type.dto';

export class UpdateLetterTypeDto extends PartialType(CreateLetterTypeDto) {}
