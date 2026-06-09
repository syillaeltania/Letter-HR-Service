import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  record(
    userId: string | null,
    action: AuditAction | keyof typeof AuditAction,
    entity: string,
    entityId?: string | null,
    oldValue?: unknown,
    newValue?: unknown,
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action: action as AuditAction,
        entity,
        entityId,
        oldValue: oldValue === undefined ? undefined : JSON.parse(JSON.stringify(oldValue)),
        newValue: newValue === undefined ? undefined : JSON.parse(JSON.stringify(newValue)),
      },
    });
  }

  findAll(query: AuditLogQueryDto) {
    return this.prisma.auditLog.findMany({
      where: {
        entity: query.entity,
        userId: query.userId,
      },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { timestamp: 'desc' },
      take: 200,
    });
  }

  history(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entity, entityId },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { timestamp: 'desc' },
    });
  }
}
