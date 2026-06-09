import { Injectable } from '@nestjs/common';
import { LetterStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

type Query = {
  year?: string;
  month?: string;
  categoryId?: string;
  letterTypeId?: string;
  letterType?: string;
  status?: LetterStatus;
  createdBy?: string;
  search?: string;
  sortBy?: 'createdAt' | 'letterNumber' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: string;
  limit?: string;
};

@Injectable()
export class OutgoingLetterNumbersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: Query) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
    const where = this.buildWhere(query);
    const orderBy = this.buildOrderBy(query);

    const [letters, total] = await this.prisma.$transaction([
      this.prisma.letter.findMany({
        where,
        include: {
          category: true,
          letterType: true,
          template: true,
          creator: { select: { id: true, name: true, email: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.letter.count({ where }),
    ]);

    return {
      data: letters.map((letter) => this.toResponse(letter)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    };
  }

  async summary(query: Pick<Query, 'year' | 'month'>) {
    const where = this.buildWhere(query);
    const [totalLetters, totalPublished, totalDraft, totalCancelled, totalByCategory] =
      await this.prisma.$transaction([
        this.prisma.letter.count({ where }),
        this.prisma.letter.count({ where: { ...where, status: 'PUBLISHED' } }),
        this.prisma.letter.count({ where: { ...where, status: 'DRAFT' } }),
        this.prisma.letter.count({ where: { ...where, status: 'CANCELLED' } }),
        this.prisma.letter.groupBy({
          by: ['categoryId'],
          where,
          _count: true,
          orderBy: { categoryId: 'asc' },
        }),
      ]);

    const categories = await this.prisma.letterCategory.findMany({
      where: { id: { in: totalByCategory.map((item) => item.categoryId) } },
      select: { id: true, categoryName: true },
    });
    const categoryById = new Map(categories.map((category) => [category.id, category]));

    return {
      totalLetters,
      totalPublished,
      totalDraft,
      totalCancelled,
      totalByCategory: totalByCategory.map((item) => ({
        categoryId: item.categoryId,
        category: categoryById.get(item.categoryId)?.categoryName ?? item.categoryId,
        total: item._count,
      })),
    };
  }

  async exportCsv(query: Query) {
    const rows = await this.prisma.letter.findMany({
      where: this.buildWhere(query),
      include: {
        category: true,
        letterType: true,
        template: true,
        creator: { select: { id: true, name: true, email: true } },
      },
      orderBy: this.buildOrderBy(query),
      take: 5000,
    });
    const header = [
      'No',
      'Nomor Surat',
      'Sequence Number',
      'Tanggal Dibuat',
      'Jenis Surat',
      'Kode Surat',
      'Kategori',
      'Perihal',
      'Nama Karyawan/Tujuan',
      'Dibuat Oleh',
      'Status',
    ];
    const lines = rows.map((letter, index) => {
      const item = this.toResponse(letter);
      return [
        index + 1,
        item.letterNumber,
        item.sequenceNumber ?? '',
        item.createdAt,
        item.letterType,
        item.typeCode,
        item.category,
        item.subject,
        item.employeeName,
        item.createdBy,
        item.status,
      ].map((value) => this.csvCell(value)).join(',');
    });
    return [header.join(','), ...lines].join('\n');
  }

  private buildWhere(query: Pick<Query, 'year' | 'month' | 'categoryId' | 'letterTypeId' | 'letterType' | 'status' | 'createdBy' | 'search'>) {
    const where: Prisma.LetterWhereInput = {};

    if (query.year || query.month) {
      const year = Number(query.year) || new Date().getFullYear();
      const month = Number(query.month);
      const from = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
      const to = month ? new Date(year, month, 1) : new Date(year + 1, 0, 1);
      where.createdAt = { gte: from, lt: to };
    }
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.letterTypeId) where.letterTypeId = query.letterTypeId;
    if (query.status) where.status = query.status;
    if (query.createdBy) where.creatorId = query.createdBy;
    if (query.letterType) {
      where.OR = [
        ...(where.OR ?? []),
        { letterType: { typeName: { contains: query.letterType, mode: 'insensitive' } } },
        { letterType: { typeCode: { contains: query.letterType, mode: 'insensitive' } } },
        { template: { templateName: { contains: query.letterType, mode: 'insensitive' } } },
      ];
    }
    if (query.search) {
      where.OR = [
        ...(where.OR ?? []),
        { letterNumber: { contains: query.search, mode: 'insensitive' } },
        { generatedLetterNumber: { contains: query.search, mode: 'insensitive' } },
        { letterType: { typeName: { contains: query.search, mode: 'insensitive' } } },
        { letterType: { typeCode: { contains: query.search, mode: 'insensitive' } } },
        { template: { templateName: { contains: query.search, mode: 'insensitive' } } },
        { category: { categoryName: { contains: query.search, mode: 'insensitive' } } },
        { category: { categoryCode: { contains: query.search, mode: 'insensitive' } } },
        { content: { path: ['employee_name'], string_contains: query.search } },
        { content: { path: ['subject'], string_contains: query.search } },
        { content: { path: ['perihal'], string_contains: query.search } },
      ];
    }

    return where;
  }

  private buildOrderBy(query: Pick<Query, 'sortBy' | 'sortOrder'>): Prisma.LetterOrderByWithRelationInput[] {
    const direction = query.sortOrder === 'asc' ? 'asc' : 'desc';
    if (query.sortBy === 'letterNumber') return [{ letterNumber: direction }, { createdAt: direction }];
    if (query.sortBy === 'status') return [{ status: direction }, { createdAt: direction }];
    return [{ createdAt: direction }, { letterNumber: direction }];
  }

  private toResponse(
    letter: Prisma.LetterGetPayload<{
      include: {
        category: true;
        letterType: true;
        template: true;
        creator: { select: { id: true; name: true; email: true } };
      };
    }>,
  ) {
    const content = letter.content as Record<string, unknown>;
    const employeeName =
      this.stringValue(content.employee_name) ||
      this.stringValue(content.employeeName) ||
      this.stringValue(content.recipient_name) ||
      this.stringValue(content.recipientName) ||
      '-';
    const subject =
      this.stringValue(content.subject) ||
      this.stringValue(content.perihal) ||
      letter.template.templateName;

    return {
      id: letter.id,
      letterNumber: letter.generatedLetterNumber ?? letter.letterNumber ?? '-',
      generatedLetterNumber: letter.generatedLetterNumber ?? letter.letterNumber ?? null,
      sequenceNumber: letter.sequenceNumber,
      createdAt: letter.createdAt.toISOString(),
      letterTypeId: letter.letterTypeId,
      letterType: letter.letterType?.typeName ?? letter.template.templateName,
      typeCode: letter.letterType?.typeCode ?? letter.category.categoryCode,
      category: letter.category.categoryName,
      categoryCode: letter.category.categoryCode,
      categoryId: letter.categoryId,
      subject,
      employeeName,
      createdBy: letter.creator.name,
      createdById: letter.creatorId,
      status: letter.status,
      pdfUrl: `/api/archive/letters/${letter.id}/download/pdf`,
      docxUrl: `/api/archive/letters/${letter.id}/download/docx`,
    };
  }

  private stringValue(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : '';
  }

  private csvCell(value: unknown) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }
}
