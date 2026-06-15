import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { DocumentsModule } from '../documents/documents.module';
import { LetterNumberingModule } from '../letter-numbering/letter-numbering.module';
import { LettersController } from './letters.controller';
import { WorkerController } from './worker.controller';
import { LettersService } from './letters.service';

@Module({
  imports: [AuditLogsModule, DocumentsModule, LetterNumberingModule],
  controllers: [LettersController, WorkerController],
  providers: [LettersService],
  exports: [LettersService],
})
export class LettersModule {}
