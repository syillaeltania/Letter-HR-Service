import { Module } from '@nestjs/common';
import { LetterNumberingController } from './letter-numbering.controller';
import { LetterNumberingService } from './letter-numbering.service';

@Module({
  controllers: [LetterNumberingController],
  providers: [LetterNumberingService],
  exports: [LetterNumberingService],
})
export class LetterNumberingModule {}
