import { Injectable, MessageEvent } from '@nestjs/common';
import { Subject } from 'rxjs';

export type OutgoingLetterEventName = 'letter.created' | 'letter.updated' | 'letter.published';

@Injectable()
export class OutgoingLetterEventsService {
  private readonly stream = new Subject<MessageEvent>();

  events() {
    return this.stream.asObservable();
  }

  emit(type: OutgoingLetterEventName, payload: Record<string, unknown>) {
    this.stream.next({ type, data: payload });
  }
}
