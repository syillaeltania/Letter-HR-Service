import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { LetterTemplatesController } from './letter-templates.controller';
import { LetterTemplatesService } from './letter-templates.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [LetterTemplatesController],
  providers: [LetterTemplatesService],
})
export class LetterTemplatesModule {}
