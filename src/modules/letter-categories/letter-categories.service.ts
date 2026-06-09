import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateLetterCategoryDto } from './dto/create-letter-category.dto';
import { CreateLetterTypeDto } from './dto/create-letter-type.dto';
import { UpdateLetterCategoryDto } from './dto/update-letter-category.dto';
import { UpdateLetterTypeDto } from './dto/update-letter-type.dto';

@Injectable()
export class LetterCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async create(actorId: string, dto: CreateLetterCategoryDto) {
    const category = await this.prisma.letterCategory.create({ data: dto });
    await this.auditLogs.record(actorId, 'CREATE', 'LetterCategory', category.id, null, category);
    return category;
  }

  findAll() {
    return this.prisma.letterCategory.findMany({
      include: { types: { orderBy: { typeCode: 'asc' } } },
      orderBy: { categoryCode: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.letterCategory.findUniqueOrThrow({
      where: { id },
      include: { types: { orderBy: { typeCode: 'asc' } } },
    });
  }

  async update(actorId: string, id: string, dto: UpdateLetterCategoryDto) {
    const oldValue = await this.findOne(id);
    const category = await this.prisma.letterCategory.update({ where: { id }, data: dto });
    await this.auditLogs.record(actorId, 'UPDATE', 'LetterCategory', id, oldValue, category);
    return category;
  }

  async remove(actorId: string, id: string) {
    const oldValue = await this.findOne(id);
    await this.prisma.letterCategory.delete({ where: { id } });
    await this.auditLogs.record(actorId, 'DELETE', 'LetterCategory', id, oldValue, null);
    return { message: 'Category deleted successfully' };
  }

  findTypes(categoryId: string) {
    return this.prisma.letterType.findMany({
      where: { categoryId },
      orderBy: { typeCode: 'asc' },
    });
  }

  async createType(actorId: string, categoryId: string, dto: CreateLetterTypeDto) {
    await this.prisma.letterCategory.findUniqueOrThrow({ where: { id: categoryId } });
    const letterType = await this.prisma.letterType.create({
      data: { ...dto, categoryId },
    });
    await this.auditLogs.record(actorId, 'CREATE', 'LetterType', letterType.id, null, letterType);
    return letterType;
  }

  async updateType(actorId: string, categoryId: string, typeId: string, dto: UpdateLetterTypeDto) {
    const oldValue = await this.prisma.letterType.findFirstOrThrow({
      where: { id: typeId, categoryId },
    });
    const letterType = await this.prisma.letterType.update({
      where: { id: typeId },
      data: dto,
    });
    await this.auditLogs.record(actorId, 'UPDATE', 'LetterType', typeId, oldValue, letterType);
    return letterType;
  }

  async removeType(actorId: string, categoryId: string, typeId: string) {
    const oldValue = await this.prisma.letterType.findFirstOrThrow({
      where: { id: typeId, categoryId },
    });
    await this.prisma.letterType.delete({ where: { id: typeId } });
    await this.auditLogs.record(actorId, 'DELETE', 'LetterType', typeId, oldValue, null);
    return { message: 'Letter type deleted successfully' };
  }
}
