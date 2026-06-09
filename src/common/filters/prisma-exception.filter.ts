import { ArgumentsHost, Catch, ConflictException, NotFoundException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    if (exception.code === 'P2002') {
      return super.catch(new ConflictException('Unique constraint violation'), host);
    }

    if (exception.code === 'P2025') {
      return super.catch(new NotFoundException('Record not found'), host);
    }

    return super.catch(exception, host);
  }
}
