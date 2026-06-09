import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { LetterCategoriesController } from './letter-categories.controller';
import { LetterCategoriesService } from './letter-categories.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [LetterCategoriesController],
  providers: [LetterCategoriesService],
})
export class LetterCategoriesModule {}
