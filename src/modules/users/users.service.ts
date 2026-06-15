import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async create(actorId: string, dto: CreateUserDto) {
    const password = await bcrypt.hash(
      dto.password,
      Number(this.config.get<string>('BCRYPT_SALT_ROUNDS') ?? 12),
    );
    const user = await this.prisma.user.create({ data: { ...dto, password } });
    await this.auditLogs.record(actorId, 'CREATE', 'User', user.id, null, this.publicUser(user));
    return this.publicUser(user);
  }

  findAll() {
    return this.prisma.user.findMany({
      select: this.selectPublic(),
      orderBy: { createdAt: 'desc' },
    });
  }

  findApprovers() {
    return this.prisma.user.findMany({
      where: { role: 'APPROVER', status: 'ACTIVE' },
      select: this.selectPublic(),
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id }, select: this.selectPublic() });
  }

  async update(actorId: string, id: string, dto: UpdateUserDto) {
    const oldUser = await this.findOne(id);
    const user = await this.prisma.user.update({ where: { id }, data: dto });
    await this.auditLogs.record(actorId, 'UPDATE', 'User', id, oldUser, this.publicUser(user));
    return this.publicUser(user);
  }

  async updateStatus(actorId: string, id: string, dto: UpdateUserStatusDto) {
    const oldUser = await this.findOne(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status, refreshTokenHash: dto.status === 'INACTIVE' ? null : undefined },
    });
    await this.auditLogs.record(actorId, 'UPDATE', 'User', id, oldUser, this.publicUser(user));
    return this.publicUser(user);
  }

  async remove(actorId: string, id: string) {
    const oldUser = await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    await this.auditLogs.record(actorId, 'DELETE', 'User', id, oldUser, null);
    return { message: 'User deleted successfully' };
  }

  private selectPublic() {
    return {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    };
  }

  private publicUser(user: {
    id: string;
    name: string;
    email: string;
    role: unknown;
    status: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
