import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ArchiveController } from './archive.controller';
import { ArchiveService } from './archive.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [ArchiveController],
  providers: [ArchiveService],
})
export class ArchiveModule {}
