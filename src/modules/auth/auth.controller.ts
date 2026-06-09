import { Body, Controller, Headers, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CurrentUserDecorator } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/types/current-user.type';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Authentication')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    const payload = await this.jwt.verifyAsync<{ sub: string }>(dto.refreshToken, {
      secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
    });
    return this.auth.refresh(payload.sub, dto.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  logout(@CurrentUserDecorator() user: CurrentUser, @Headers('user-agent') _userAgent?: string) {
    return this.auth.logout(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Patch('change-password')
  changePassword(@CurrentUserDecorator() user: CurrentUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, dto);
  }
}
