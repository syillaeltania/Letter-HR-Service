import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { LetterCategoriesModule } from './modules/letter-categories/letter-categories.module';
import { LetterTemplatesModule } from './modules/letter-templates/letter-templates.module';
import { LettersModule } from './modules/letters/letters.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { ArchiveModule } from './modules/archive/archive.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { DatabaseModule } from './database/database.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { HealthModule } from './modules/health/health.module';
import { OutgoingLetterNumbersModule } from './modules/outgoing-letter-numbers/outgoing-letter-numbers.module';
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [appConfig, jwtConfig],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        redact: ['req.headers.authorization', 'req.body.password', 'req.body.refreshToken'],
      },
    }),
    DatabaseModule,
    AuditLogsModule,
    AuthModule,
    UsersModule,
    LetterCategoriesModule,
    LetterTemplatesModule,
    DocumentsModule,
    HealthModule,
    OutgoingLetterNumbersModule,
    LettersModule,
    ApprovalsModule,
    ArchiveModule,
  ],
})
export class AppModule {}
