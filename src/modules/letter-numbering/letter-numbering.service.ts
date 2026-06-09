import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

@Injectable()
export class LetterNumberingService {
  constructor(private readonly prisma: PrismaService) {}

  generate(categoryId: string, letterTypeId?: string, issuedAt = new Date()) {
    return this.prisma.$transaction((tx) => this.generateInTransaction(tx, categoryId, letterTypeId, issuedAt), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  async preview(categoryId: string, letterTypeId?: string | null, issuedAt = new Date()) {
    const month = issuedAt.getMonth() + 1;
    const year = issuedAt.getFullYear();
    const { category, typeCode } = await this.resolveNumberingContext(categoryId, letterTypeId);

    const sequence = await this.prisma.letterNumberSequence.findUnique({
      where: { categoryId_month_year: { categoryId, month, year } },
    });
    const sequenceNumber = (sequence?.currentNumber ?? 0) + 1;

    return this.buildNumberParts(category, typeCode, sequenceNumber, month, year);
  }

  async previewWithSequence(categoryId: string, letterTypeId: string | null | undefined, sequence: unknown, issuedAt = new Date()) {
    const month = issuedAt.getMonth() + 1;
    const year = issuedAt.getFullYear();
    const { category, typeCode } = await this.resolveNumberingContext(categoryId, letterTypeId);

    const sequenceNumber = this.parseSequence(sequence);
    const numberParts = this.buildNumberParts(category, typeCode, sequenceNumber, month, year);
    await this.validateLetterSequence(categoryId, sequenceNumber, month, year, numberParts.letterNumber);
    return numberParts;
  }

  async previewWithSequenceUnchecked(
    categoryId: string,
    letterTypeId: string | null | undefined,
    sequence: unknown,
    issuedAt = new Date(),
  ) {
    const month = issuedAt.getMonth() + 1;
    const year = issuedAt.getFullYear();
    const { category, typeCode } = await this.resolveNumberingContext(categoryId, letterTypeId);
    const sequenceNumber = this.parseSequence(sequence);

    return this.buildNumberParts(category, typeCode, sequenceNumber, month, year);
  }

  async nextSequence(categoryId: string, letterTypeId: string | null | undefined, letterDate: string) {
    const issuedAt = this.parseLetterDate(letterDate);
    const month = issuedAt.getMonth() + 1;
    const year = issuedAt.getFullYear();
    const { category, typeCode } = await this.resolveNumberingContext(categoryId, letterTypeId);
    const sequence = await this.prisma.letterNumberSequence.findUnique({
      where: { categoryId_month_year: { categoryId, month, year } },
    });
    const nextSequence = (sequence?.currentNumber ?? 0) + 1;
    const numberParts = this.buildNumberParts(category, typeCode, nextSequence, month, year);

    return {
      categoryId,
      letterTypeId: letterTypeId || null,
      letterDate,
      month,
      romanMonth: numberParts.letterMonthRoman,
      year,
      nextSequence,
      displaySequence: numberParts.letterSequence,
      typeCode,
      previewLetterNumber: numberParts.letterNumber,
    };
  }

  async validateSequence(
    categoryId: string,
    letterTypeId: string | null | undefined,
    letterDate: string,
    sequence: unknown,
  ) {
    const issuedAt = this.parseLetterDate(letterDate);
    const numberParts = await this.previewWithSequence(categoryId, letterTypeId, sequence, issuedAt);
    return {
      valid: true,
      displaySequence: numberParts.letterSequence,
      letterNumber: numberParts.letterNumber,
    };
  }

  async previewBlankSequence(categoryId: string, letterTypeId: string | null | undefined, letterDate: string) {
    const issuedAt = this.parseLetterDate(letterDate);
    const month = issuedAt.getMonth() + 1;
    const year = issuedAt.getFullYear();
    const { category, typeCode } = await this.resolveNumberingContext(categoryId, letterTypeId);

    return {
      letterNumber: this.formatLetterNumberWithSequenceDisplay(category, typeCode, '', month, year),
      sequenceNumber: null,
      letterSequence: '',
      letterTypeCode: typeCode,
      letterCategoryCode: category.categoryCode,
      letterMonthRoman: ROMAN_MONTHS[month - 1],
      letterYear: year,
    };
  }

  async generateInTransaction(
    tx: Prisma.TransactionClient,
    categoryId: string,
    letterTypeId?: string | null,
    issuedAt = new Date(),
  ) {
    const month = issuedAt.getMonth() + 1;
    const year = issuedAt.getFullYear();
    const { category, typeCode } = await this.resolveNumberingContextInTransaction(tx, categoryId, letterTypeId);

    const sequence = await tx.letterNumberSequence.upsert({
      where: { categoryId_month_year: { categoryId, month, year } },
      create: { categoryId, month, year, currentNumber: 1 },
      update: { currentNumber: { increment: 1 } },
    });
    const sequenceNumber = sequence.currentNumber;
    const letterNumber = this.formatLetterNumber(category, typeCode, sequenceNumber, month, year);

    return { letterNumber, sequenceNumber };
  }

  async generateManualInTransaction(
    tx: Prisma.TransactionClient,
    categoryId: string,
    letterTypeId: string | null | undefined,
    sequence: unknown,
    issuedAt = new Date(),
  ) {
    const month = issuedAt.getMonth() + 1;
    const year = issuedAt.getFullYear();
    const sequenceNumber = this.parseSequence(sequence);
    const { category, typeCode } = await this.resolveNumberingContextInTransaction(tx, categoryId, letterTypeId);
    const numberParts = this.buildNumberParts(category, typeCode, sequenceNumber, month, year);
    await this.validateLetterSequenceInTransaction(tx, categoryId, sequenceNumber, month, year, numberParts.letterNumber);

    await tx.letterNumberSequence.upsert({
      where: { categoryId_month_year: { categoryId, month, year } },
      create: { categoryId, month, year, currentNumber: sequenceNumber },
      update: { currentNumber: { increment: sequenceNumber > 0 ? 0 : 0 } },
    });
    await tx.letterNumberSequence.updateMany({
      where: { categoryId, month, year, currentNumber: { lt: sequenceNumber } },
      data: { currentNumber: sequenceNumber },
    });

    return { letterNumber: numberParts.letterNumber, sequenceNumber };
  }

  parseLetterDate(value: unknown) {
    const rawValue = String(value ?? '').trim();
    if (!rawValue) throw new BadRequestException('Tanggal surat dibuat wajib diisi');

    const normalizedValue = rawValue.includes('/') ? rawValue.split('/').reverse().join('-') : rawValue;
    const issuedAt = new Date(`${normalizedValue}T00:00:00`);
    if (Number.isNaN(issuedAt.getTime())) {
      throw new BadRequestException('Tanggal surat dibuat tidak valid');
    }
    return issuedAt;
  }

  private parseSequence(sequence: unknown) {
    const rawValue = String(sequence ?? '').trim();
    if (!/^\d+$/.test(rawValue)) {
      throw new BadRequestException('Nomor urut surat harus berupa angka');
    }
    const sequenceNumber = Number(rawValue);
    if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
      throw new BadRequestException('Nomor urut surat harus lebih besar dari 0');
    }
    return sequenceNumber;
  }

  private async resolveNumberingContext(categoryId: string, letterTypeId?: string | null) {
    return this.resolveNumberingContextInTransaction(this.prisma, categoryId, letterTypeId);
  }

  private async resolveNumberingContextInTransaction(
    tx: Pick<Prisma.TransactionClient, 'letterCategory' | 'letterType'>,
    categoryId: string,
    letterTypeId?: string | null,
  ) {
    const category = await tx.letterCategory.findUniqueOrThrow({
      where: { id: categoryId },
      include: { types: true },
    });
    const letterType = letterTypeId
      ? await tx.letterType.findUniqueOrThrow({ where: { id: letterTypeId } })
      : category.types.find((type) => type.typeCode === category.categoryCode);
    if (letterType && letterType.categoryId !== categoryId) {
      throw new BadRequestException('Letter type does not belong to the selected category');
    }

    return {
      category,
      letterType,
      typeCode: letterType?.typeCode ?? category.categoryCode,
    };
  }

  private async validateLetterSequence(
    categoryId: string,
    sequenceNumber: number,
    month: number,
    year: number,
    letterNumber: string,
  ) {
    return this.validateLetterSequenceInTransaction(this.prisma, categoryId, sequenceNumber, month, year, letterNumber);
  }

  private async validateLetterSequenceInTransaction(
    tx: Pick<Prisma.TransactionClient, 'letter' | '$queryRaw'>,
    categoryId: string,
    sequenceNumber: number,
    month: number,
    year: number,
    letterNumber: string,
  ) {
    const duplicateLetterNumber = await tx.letter.findFirst({
      where: {
        OR: [{ letterNumber }, { generatedLetterNumber: letterNumber }],
      },
    });
    if (duplicateLetterNumber) throw new BadRequestException('Nomor surat sudah digunakan');

    const [duplicateSequence] = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM letters
      WHERE category_id = ${categoryId}::uuid
        AND sequence_number = ${sequenceNumber}
        AND EXTRACT(
          MONTH FROM COALESCE(
            CASE
              WHEN content->>'letter_date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                THEN (content->>'letter_date')::date
              ELSE NULL
            END,
            approved_at,
            created_at
          )
        ) = ${month}
        AND EXTRACT(
          YEAR FROM COALESCE(
            CASE
              WHEN content->>'letter_date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                THEN (content->>'letter_date')::date
              ELSE NULL
            END,
            approved_at,
            created_at
          )
        ) = ${year}
      LIMIT 1
    `;
    if (duplicateSequence) {
      throw new BadRequestException('Nomor urut surat sudah digunakan untuk kategori, bulan, dan tahun yang sama');
    }
  }

  private buildNumberParts(
    category: { categoryCode: string; numberingFormat: string },
    typeCode: string,
    sequenceNumber: number,
    month: number,
    year: number,
  ) {
    const letterSequence = sequenceNumber.toString().padStart(3, '0');
    return {
      letterNumber: this.formatLetterNumber(category, typeCode, sequenceNumber, month, year),
      sequenceNumber,
      letterSequence,
      letterTypeCode: typeCode,
      letterCategoryCode: category.categoryCode,
      letterMonthRoman: ROMAN_MONTHS[month - 1],
      letterYear: year,
    };
  }

  private formatLetterNumber(
    category: { categoryCode: string; numberingFormat: string },
    typeCode: string,
    sequenceNumber: number,
    month: number,
    year: number,
  ) {
    return this.formatLetterNumberWithSequenceDisplay(
      category,
      typeCode,
      sequenceNumber.toString().padStart(3, '0'),
      month,
      year,
    );
  }

  private formatLetterNumberWithSequenceDisplay(
    category: { categoryCode: string; numberingFormat: string },
    typeCode: string,
    sequenceDisplay: string,
    month: number,
    year: number,
  ) {
    const format = category.numberingFormat.includes('{{type_code}}')
      ? category.numberingFormat
      : category.numberingFormat.replace('{{category_code}}', '{{type_code}}');

    return format
      .replace('{{sequence}}', sequenceDisplay)
      .replace('{{category_code}}', category.categoryCode)
      .replace('{{type_code}}', typeCode)
      .replace('{{roman_month}}', ROMAN_MONTHS[month - 1])
      .replace('{{month}}', month.toString().padStart(2, '0'))
      .replace('{{year}}', year.toString());
  }
}
