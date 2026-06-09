import { Controller, Get, Query, Res, Sse, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { OutgoingLetterEventsService } from './outgoing-letter-events.service';
import { OutgoingLetterNumbersService } from './outgoing-letter-numbers.service';

@ApiTags('Outgoing Letter Numbers')
@Controller({ path: 'outgoing-letter-numbers', version: '1' })
export class OutgoingLetterNumbersController {
  constructor(
    private readonly outgoingLetters: OutgoingLetterNumbersService,
    private readonly events: OutgoingLetterEventsService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.outgoingLetters.findAll(query);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('summary')
  summary(@Query() query: Record<string, string>) {
    return this.outgoingLetters.summary(query);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('export')
  async export(@Query() query: Record<string, string>, @Res() res: Response) {
    const csv = await this.outgoingLetters.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="data-nomor-surat-keluar.csv"');
    return res.send(`\uFEFF${csv}`);
  }

  @Sse('events')
  eventsStream(): Observable<MessageEvent> {
    return this.events.events();
  }
}
