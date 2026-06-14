import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ArchiveQueryDto } from './dto/archive-query.dto';

@Injectable()
export class ArchiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  search(query: ArchiveQueryDto) {
    return this.prisma.letter.findMany({
      where: {
        status: query.status,
        categoryId: query.categoryId,
        createdAt: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
        OR: query.search
          ? [
              { letterNumber: { contains: query.search, mode: 'insensitive' } },
              { template: { templateName: { contains: query.search, mode: 'insensitive' } } },
            ]
          : undefined,
      },
      include: {
        category: true,
        template: true,
        creator: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  history(letterId: string) {
    return this.auditLogs.history('Letter', letterId);
  }

  async getDownloadPath(letterId: string, type: 'pdf' | 'docx') {
    const letter = await this.prisma.letter.findUniqueOrThrow({ where: { id: letterId } });
    if (type === 'docx') throw new Error('DOCX is no longer supported'); const filePath = letter.generatedPdf;
    if (!filePath) throw new NotFoundException(`Generated ${type.toUpperCase()} not found`);
    return filePath;
  }
}
