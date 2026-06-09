import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { LetterStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { DocumentsService } from '../documents/documents.service';
import { LetterNumberingService } from '../letter-numbering/letter-numbering.service';
import { OutgoingLetterEventsService } from '../outgoing-letter-numbers/outgoing-letter-events.service';
import { CreateLetterDto } from './dto/create-letter.dto';
import { LetterQueryDto } from './dto/letter-query.dto';
import { PreviewLetterNumberDto } from './dto/preview-letter-number.dto';
import { UpdateLetterDto } from './dto/update-letter.dto';

type NumberingPreview = {
  letterNumber: string;
  sequenceNumber: number | null;
  letterSequence: string;
  letterTypeCode: string;
  letterCategoryCode: string;
  letterMonthRoman: string;
  letterYear: number;
};

@Injectable()
export class LettersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly auditLogs: AuditLogsService,
    private readonly outgoingEvents: OutgoingLetterEventsService,
    private readonly numbering: LetterNumberingService,
  ) {}

  async create(actorId: string, dto: CreateLetterDto) {
    await this.validateLetterType(dto.categoryId, dto.letterTypeId);
    await this.validateManualLetterNumber(dto.categoryId, dto.letterTypeId, dto.content);
    const template = await this.prisma.letterTemplate.findUniqueOrThrow({
      where: { id: dto.templateId },
    });
    if (template.categoryId !== dto.categoryId) {
      throw new BadRequestException('Template does not belong to the selected category');
    }
    if (template.letterTypeId && template.letterTypeId !== dto.letterTypeId) {
      throw new BadRequestException('Template does not belong to the selected letter type');
    }
    await this.validateTemplateContent(dto.categoryId, dto.letterTypeId, dto.content);

    const letterDateMetadata = this.getLetterDateMetadata(dto.content);
    const letter = await this.prisma.letter.create({
      data: {
        ...dto,
        ...letterDateMetadata,
        creatorId: actorId,
        content: dto.content as Prisma.InputJsonObject,
      },
    });
    await this.auditLogs.record(actorId, 'CREATE', 'Letter', letter.id, null, letter);
    this.outgoingEvents.emit('letter.created', { id: letter.id, status: letter.status });
    return letter;
  }

  findAll(query: LetterQueryDto) {
    return this.prisma.letter.findMany({
      where: {
        status: query.status,
        categoryId: query.categoryId,
        letterTypeId: query.letterTypeId,
        OR: query.search
          ? [
              { letterNumber: { contains: query.search, mode: 'insensitive' } },
              { generatedLetterNumber: { contains: query.search, mode: 'insensitive' } },
              { template: { templateName: { contains: query.search, mode: 'insensitive' } } },
            ]
          : undefined,
      },
      include: {
        category: true,
        letterType: true,
        template: true,
        creator: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.letter.findUniqueOrThrow({
      where: { id },
      include: { category: true, letterType: true, template: true, approvals: true },
    });
  }

  async update(actorId: string, id: string, dto: UpdateLetterDto) {
    const oldValue = await this.findOne(id);
    if (!['DRAFT', 'REVISION'].includes(oldValue.status)) {
      throw new ForbiddenException('Only draft or revision letters can be updated');
    }
    await this.validateLetterType(dto.categoryId ?? oldValue.categoryId, dto.letterTypeId ?? oldValue.letterTypeId);
    if (dto.content) {
      await this.validateManualLetterNumber(
        dto.categoryId ?? oldValue.categoryId,
        dto.letterTypeId ?? oldValue.letterTypeId,
        dto.content,
      );
      await this.validateTemplateContent(
        dto.categoryId ?? oldValue.categoryId,
        dto.letterTypeId ?? oldValue.letterTypeId,
        dto.content,
      );
    }
    const letterDateMetadata = dto.content ? this.getLetterDateMetadata(dto.content) : {};
    const letter = await this.prisma.letter.update({
      where: { id },
      data: { ...dto, ...letterDateMetadata, content: dto.content as Prisma.InputJsonObject | undefined },
    });
    await this.auditLogs.record(actorId, 'UPDATE', 'Letter', id, oldValue, letter);
    this.outgoingEvents.emit('letter.updated', { id: letter.id, status: letter.status });
    return letter;
  }

  async deleteDraft(actorId: string, id: string) {
    const letter = await this.findOne(id);
    if (letter.status !== 'DRAFT') throw new ForbiddenException('Only draft letters can be deleted');
    await this.prisma.letter.delete({ where: { id } });
    await this.auditLogs.record(actorId, 'DELETE', 'Letter', id, letter, null);
    return { message: 'Draft deleted successfully' };
  }

  async preview(id: string) {
    const letter = await this.findOne(id);
    return {
      letterId: letter.id,
      letterNumber: letter.letterNumber,
      content: await this.documents.renderPreview(
        letter.template.templateContent,
        this.withNumberingContent(letter.content as Record<string, unknown>, letter),
        letter.letterNumber,
      ),
    };
  }

  async previewPdf(id: string) {
    const letter = await this.findOne(id);
    return this.documents.generatePdf(
      letter.template.templateContent,
      this.withNumberingContent(letter.content as Record<string, unknown>, letter),
      letter.letterNumber ?? 'PREVIEW',
      this.resolveDocxTemplatePath(letter.template.docxTemplatePath, letter.letterType?.typeCode ?? letter.category.categoryCode),
    );
  }

  async previewDraftPdf(dto: CreateLetterDto) {
    await this.validateLetterType(dto.categoryId, dto.letterTypeId, false);
    const template = await this.prisma.letterTemplate.findUniqueOrThrow({
      where: { id: dto.templateId },
      include: { category: true },
    });
    if (template.categoryId !== dto.categoryId) {
      throw new BadRequestException('Template does not belong to the selected category');
    }
    if (template.letterTypeId && template.letterTypeId !== dto.letterTypeId) {
      throw new BadRequestException('Template does not belong to the selected letter type');
    }
    const letterType = dto.letterTypeId
      ? await this.prisma.letterType.findUnique({ where: { id: dto.letterTypeId } })
      : null;

    const letterDate = this.resolveLetterDate(dto.content);
    const previewNumber = dto.content?.letter_sequence
      ? await this.numbering.previewWithSequenceUnchecked(
          dto.categoryId,
          dto.letterTypeId,
          dto.content.letter_sequence,
          letterDate,
        )
      : await this.numbering.previewBlankSequence(dto.categoryId, dto.letterTypeId, this.resolveLetterDateValue(dto.content));

    return this.documents.generatePdf(
      template.templateContent,
      this.withPreviewNumberingContent(dto.content, previewNumber),
      previewNumber.letterNumber,
      this.resolveDocxTemplatePath(template.docxTemplatePath, letterType?.typeCode ?? template.category.categoryCode),
    );
  }

  async previewNumber(dto: PreviewLetterNumberDto) {
    await this.validateLetterType(dto.categoryId, dto.letterTypeId, false);
    const letterDate = this.resolveLetterDate(dto.content);
    const previewNumber = dto.content?.letter_sequence
      ? await this.numbering.previewWithSequence(dto.categoryId, dto.letterTypeId, dto.content.letter_sequence, letterDate)
      : await this.numbering.previewBlankSequence(dto.categoryId, dto.letterTypeId, this.resolveLetterDateValue(dto.content));
    return this.toNumberingVariables(previewNumber);
  }

  async generateDocx(actorId: string, id: string) {
    const letter = await this.findOne(id);
    if (!letter.letterNumber) throw new BadRequestException('Letter number is required');
    const generatedDocx = await this.documents.generateDocx(
      letter.template.templateContent,
      this.withNumberingContent(letter.content as Record<string, unknown>, letter),
      letter.letterNumber,
      this.resolveDocxTemplatePath(letter.template.docxTemplatePath, letter.letterType?.typeCode ?? letter.category.categoryCode),
    );
    const updated = await this.prisma.letter.update({ where: { id }, data: { generatedDocx } });
    await this.auditLogs.record(actorId, 'UPDATE', 'Letter', id, letter, updated);
    this.outgoingEvents.emit('letter.updated', { id: updated.id, status: updated.status });
    return updated;
  }

  async generatePdf(actorId: string, id: string) {
    const letter = await this.findOne(id);
    if (!letter.letterNumber) throw new BadRequestException('Letter number is required');
    const generatedPdf = await this.documents.generatePdf(
      letter.template.templateContent,
      this.withNumberingContent(letter.content as Record<string, unknown>, letter),
      letter.letterNumber,
      this.resolveDocxTemplatePath(letter.template.docxTemplatePath, letter.letterType?.typeCode ?? letter.category.categoryCode),
    );
    const updated = await this.prisma.letter.update({ where: { id }, data: { generatedPdf } });
    await this.auditLogs.record(actorId, 'UPDATE', 'Letter', id, letter, updated);
    this.outgoingEvents.emit('letter.updated', { id: updated.id, status: updated.status });
    return updated;
  }

  publish(actorId: string, id: string) {
    return this.transition(actorId, id, 'PUBLISHED', 'PUBLISH');
  }

  cancel(actorId: string, id: string) {
    return this.transition(actorId, id, 'CANCELLED', 'UPDATE');
  }

  private async transition(actorId: string, id: string, status: LetterStatus, action: 'PUBLISH' | 'UPDATE') {
    const oldValue = await this.findOne(id);
    const letter = await this.prisma.letter.update({
      where: { id },
      data: { status, publishedAt: status === 'PUBLISHED' ? new Date() : undefined },
    });
    await this.auditLogs.record(actorId, action, 'Letter', id, oldValue, letter);
    this.outgoingEvents.emit(status === 'PUBLISHED' ? 'letter.published' : 'letter.updated', {
      id: letter.id,
      status: letter.status,
    });
    return letter;
  }

  private resolveDocxTemplatePath(docxTemplatePath: string | null, categoryCode: string) {
    if (docxTemplatePath) return docxTemplatePath;

    const templatePathByCategory: Record<string, string> = {
      'KK.01': 'templates/docx/kontrak-kerja-karyawan.docx',
      'KK.02': 'templates/docx/kontrak-kerja-magang.docx',
      'KK.03': 'templates/docx/kontrak-kerja-freelancer.docx',
      'KK.01-OL': 'templates/docx/offering-letter.docx',
    };

    return templatePathByCategory[categoryCode] ?? null;
  }

  private withNumberingContent(
    content: Record<string, unknown>,
    letter: Awaited<ReturnType<LettersService['findOne']>>,
  ) {
    const issuedAt = letter.letterDate ?? letter.approvedAt ?? letter.createdAt ?? new Date();
    const sequence = letter.sequenceNumber ? letter.sequenceNumber.toString().padStart(3, '0') : content.letter_sequence;
    return {
      ...content,
      letter_number: letter.letterNumber ?? content.letter_number,
      letter_sequence: sequence,
      sequence_number: letter.sequenceNumber ?? content.sequence_number,
      letter_type_code: letter.letterType?.typeCode ?? content.letter_type_code,
      letter_category_code: letter.category.categoryCode ?? content.letter_category_code,
      letter_month_roman: letter.letterMonthRoman ?? this.romanMonth(issuedAt.getMonth() + 1),
      letter_year: letter.letterYear ?? issuedAt.getFullYear(),
    };
  }

  private withPreviewNumberingContent(
    content: Record<string, unknown>,
    previewNumber: NumberingPreview,
  ) {
    return {
      ...content,
      ...this.toNumberingVariables(previewNumber),
    };
  }

  private toNumberingVariables(previewNumber: NumberingPreview) {
    return {
      letter_number: previewNumber.letterNumber,
      sequence_number: previewNumber.sequenceNumber,
      letter_sequence: previewNumber.letterSequence,
      letter_type_code: previewNumber.letterTypeCode,
      letter_category_code: previewNumber.letterCategoryCode,
      letter_month_roman: previewNumber.letterMonthRoman,
      letter_year: previewNumber.letterYear,
    };
  }

  private async validateManualLetterNumber(
    categoryId: string,
    letterTypeId: string | null | undefined,
    content: Record<string, unknown>,
  ) {
    if (!String(content.letter_sequence ?? '').trim()) {
      throw new BadRequestException('Nomor urut surat wajib diisi.');
    }

    await this.numbering.validateSequence(
      categoryId,
      letterTypeId,
      this.resolveLetterDateValue(content),
      content.letter_sequence,
    );
  }

  private resolveLetterDate(content?: Record<string, unknown>) {
    return this.numbering.parseLetterDate(this.resolveLetterDateValue(content));
  }

  private resolveLetterDateValue(content?: Record<string, unknown>) {
    return String(content?.letter_date ?? '').trim();
  }

  private getLetterDateMetadata(content: Record<string, unknown>) {
    const issuedAt = this.resolveLetterDate(content);
    const month = issuedAt.getMonth() + 1;

    return {
      letterDate: issuedAt,
      letterMonth: month,
      letterYear: issuedAt.getFullYear(),
      letterMonthRoman: this.romanMonth(month),
    };
  }

  private async validateTemplateContent(
    categoryId: string,
    letterTypeId: string | null | undefined,
    content: Record<string, unknown>,
  ) {
    const letterType = letterTypeId
      ? await this.prisma.letterType.findUnique({ where: { id: letterTypeId } })
      : null;
    const category = await this.prisma.letterCategory.findUnique({ where: { id: categoryId } });
    const typeCode = letterType?.typeCode ?? category?.categoryCode;

    if (typeCode === 'SE') {
      this.assertRequiredField(content, 'perihal', 'Perihal wajib diisi.');
      this.assertRequiredField(content, 'memutuskan', 'Memutuskan wajib diisi.');
      return;
    }

    if (typeCode === 'KK.02') {
      this.assertRequiredField(content, 'intern_name', 'Nama peserta magang wajib diisi.');
      this.assertRequiredField(content, 'contract_start_date', 'Tanggal mulai wajib diisi.');
      this.assertRequiredField(content, 'contract_end_date', 'Tanggal berakhir wajib diisi.');
      this.assertRequiredField(content, 'position', 'Posisi wajib diisi.');
      this.assertRequiredField(content, 'basic_salary', 'Gaji pokok wajib diisi.');
      this.assertRequiredField(content, 'meal_allowance', 'Uang makan wajib diisi.');
      return;
    }

    if (typeCode === 'KK.01-OL') {
      this.assertRequiredField(content, 'candidate_name', 'Nama kandidat wajib diisi.');
      this.assertRequiredField(content, 'position', 'Posisi wajib diisi.');
      this.assertRequiredField(content, 'start_work_date', 'Tanggal mulai bekerja wajib diisi.');
      this.assertRequiredField(content, 'placement_location', 'Lokasi penempatan wajib diisi.');
      this.assertRequiredField(content, 'contract_period', 'Periode kontrak wajib diisi.');
      this.assertRequiredField(content, 'basic_salary', 'Gaji pokok wajib diisi.');
    }
  }

  private assertRequiredField(content: Record<string, unknown>, field: string, message: string) {
    if (!String(content[field] ?? '').trim()) throw new BadRequestException(message);
  }

  private romanMonth(month: number) {
    return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][month - 1];
  }

  private async validateLetterType(categoryId: string, letterTypeId?: string | null, requiredWhenAvailable = true) {
    const activeTypeCount = await this.prisma.letterType.count({
      where: { categoryId, isActive: true },
    });
    if (!letterTypeId) {
      if (requiredWhenAvailable && activeTypeCount > 0) {
        throw new BadRequestException('Letter type is required for the selected category');
      }
      return;
    }

    const letterType = await this.prisma.letterType.findUniqueOrThrow({
      where: { id: letterTypeId },
    });
    if (letterType.categoryId !== categoryId) {
      throw new BadRequestException('Letter type does not belong to the selected category');
    }
    if (!letterType.isActive) {
      throw new BadRequestException('Selected letter type is inactive');
    }
  }
}
