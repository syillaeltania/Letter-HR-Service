import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateLetterTemplateDto } from './dto/create-letter-template.dto';
import { UpdateLetterTemplateDto } from './dto/update-letter-template.dto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

@Injectable()
export class LetterTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly config: ConfigService,
  ) {}

  async create(actorId: string, dto: CreateLetterTemplateDto) {
    await this.validateLetterType(dto.categoryId, dto.letterTypeId);
    const latest = await this.prisma.letterTemplate.findFirst({
      where: { categoryId: dto.categoryId, templateName: dto.templateName },
      orderBy: { version: 'desc' },
    });
    const template = await this.prisma.letterTemplate.create({
      data: { ...dto, version: (latest?.version ?? 0) + 1 },
    });
    await this.auditLogs.record(actorId, 'CREATE', 'LetterTemplate', template.id, null, template);
    return template;
  }

  findAll(categoryId?: string) {
    return this.prisma.letterTemplate.findMany({
      where: { categoryId },
      include: { category: true, letterType: true },
      orderBy: [{ templateName: 'asc' }, { version: 'desc' }],
    });
  }

  findOne(id: string) {
    return this.prisma.letterTemplate.findUniqueOrThrow({
      where: { id },
      include: { category: true, letterType: true },
    });
  }

  async update(actorId: string, id: string, dto: UpdateLetterTemplateDto) {
    const oldValue = await this.findOne(id);
    await this.validateLetterType(dto.categoryId ?? oldValue.categoryId, dto.letterTypeId ?? oldValue.letterTypeId);
    const template = await this.prisma.letterTemplate.update({ where: { id }, data: dto });
    await this.auditLogs.record(actorId, 'UPDATE', 'LetterTemplate', id, oldValue, template);
    return template;
  }

  async createVersion(actorId: string, id: string, dto: UpdateLetterTemplateDto) {
    const source = await this.findOne(id);
    const categoryId = dto.categoryId ?? source.categoryId;
    const letterTypeId = dto.letterTypeId ?? source.letterTypeId;
    await this.validateLetterType(categoryId, letterTypeId);
    const latest = await this.prisma.letterTemplate.findFirst({
      where: { categoryId, templateName: dto.templateName ?? source.templateName },
      orderBy: { version: 'desc' },
    });
    const template = await this.prisma.letterTemplate.create({
      data: {
        categoryId,
        letterTypeId,
        templateName: dto.templateName ?? source.templateName,
        templateContent: dto.templateContent ?? source.templateContent,
        
        placeholders: dto.placeholders ?? source.placeholders,
        status: dto.status ?? 'DRAFT',
        version: (latest?.version ?? source.version) + 1,
      },
    });
    await this.auditLogs.record(actorId, 'CREATE', 'LetterTemplate', template.id, source, template);
    return template;
  }

  async uploadDocx(actorId: string, id: string, file: Express.Multer.File) {
    const oldValue = await this.findOne(id);
    const templateDir = this.config.get<string>('DOCX_TEMPLATE_PATH') ?? './storage/templates';
    await fs.mkdir(templateDir, { recursive: true });
    const filePath = path.join(templateDir, `${id}-${randomUUID()}.docx`);
    await fs.writeFile(filePath, file.buffer);
    const template = await this.prisma.letterTemplate.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
    await this.auditLogs.record(actorId, 'UPDATE', 'LetterTemplate', id, oldValue, template);
    return template;
  }

  async remove(actorId: string, id: string) {
    const oldValue = await this.findOne(id);
    await this.prisma.letterTemplate.delete({ where: { id } });
    await this.auditLogs.record(actorId, 'DELETE', 'LetterTemplate', id, oldValue, null);
    return { message: 'Template deleted successfully' };
  }

  private async validateLetterType(categoryId: string, letterTypeId?: string | null) {
    if (!letterTypeId) return;
    const letterType = await this.prisma.letterType.findUniqueOrThrow({
      where: { id: letterTypeId },
    });
    if (letterType.categoryId !== categoryId) {
      throw new BadRequestException('Letter type does not belong to the selected category');
    }
  }
}
