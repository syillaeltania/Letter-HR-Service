import { Controller, Post, Headers, Body, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Receiver } from '@upstash/qstash';
import { LettersService } from './letters.service';

@ApiTags('Worker')
@Controller({ path: 'worker', version: '1' })
export class WorkerController {
  private receiver: Receiver;

  constructor(private readonly letters: LettersService) {
    this.receiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
    });
  }

  @Post('pdf')
  async handlePdfQueue(
    @Headers('upstash-signature') signature: string,
    @Body() body: { letterId: string; actorId: string }
  ) {
    if (process.env.NODE_ENV === 'production') {
      if (!signature) throw new UnauthorizedException('Missing Upstash signature');
      
      const isValid = await this.receiver.verify({
        signature,
        body: JSON.stringify(body),
      }).catch(() => false);
      
      if (!isValid) throw new UnauthorizedException('Invalid Upstash signature');
    }

    return this.letters.processPdfWorker(body.actorId, body.letterId);
  }
}
