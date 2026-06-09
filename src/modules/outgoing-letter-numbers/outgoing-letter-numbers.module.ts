import { Global, Module } from '@nestjs/common';
import { OutgoingLetterEventsService } from './outgoing-letter-events.service';
import { OutgoingLetterNumbersController } from './outgoing-letter-numbers.controller';
import { OutgoingLetterNumbersService } from './outgoing-letter-numbers.service';

@Global()
@Module({
  controllers: [OutgoingLetterNumbersController],
  providers: [OutgoingLetterNumbersService, OutgoingLetterEventsService],
  exports: [OutgoingLetterEventsService],
})
export class OutgoingLetterNumbersModule {}
