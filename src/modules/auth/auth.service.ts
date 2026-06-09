import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('Invalid credentials');

    const validPassword = await bcrypt.compare(dto.password, user.password);
    if (!validPassword) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.signTokens(user.id, user.email, user.role);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    await this.auditLogs.record(user.id, 'LOGIN', 'User', user.id, null, { email: user.email });

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      ...tokens,
    };
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.refreshTokenHash) throw new ForbiddenException('Refresh token denied');

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) throw new ForbiddenException('Refresh token denied');

    const tokens = await this.signTokens(user.id, user.email, user.role);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    await this.auditLogs.record(userId, 'LOGOUT', 'User', userId);
    return { message: 'Logged out successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const validPassword = await bcrypt.compare(dto.currentPassword, user.password);
    if (!validPassword) throw new UnauthorizedException('Current password is invalid');

    const password = await bcrypt.hash(
      dto.newPassword,
      Number(this.config.get<string>('BCRYPT_SALT_ROUNDS') ?? 12),
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: { password, refreshTokenHash: null },
    });
    await this.auditLogs.record(userId, 'UPDATE', 'User', userId, null, { passwordChanged: true });
    return { message: 'Password changed successfully' };
  }

  private async signTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessExpiresIn') ?? '15m',
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn') ?? '7d',
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    const refreshTokenHash = await bcrypt.hash(
      refreshToken,
      Number(this.config.get<string>('BCRYPT_SALT_ROUNDS') ?? 12),
    );
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash } });
  }
}
