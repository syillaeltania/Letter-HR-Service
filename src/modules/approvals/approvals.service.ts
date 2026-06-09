import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { LetterNumberingService } from '../letter-numbering/letter-numbering.service';
import { OutgoingLetterEventsService } from '../outgoing-letter-numbers/outgoing-letter-events.service';
import { ApprovalActionDto } from './dto/approval-action.dto';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbering: LetterNumberingService,
    private readonly auditLogs: AuditLogsService,
    private readonly outgoingEvents: OutgoingLetterEventsService,
  ) {}

  async submit(actorId: string, letterId: string, approverId: string) {
    const letter = await this.prisma.letter.findUniqueOrThrow({ where: { id: letterId } });
    const approver = await this.prisma.user.findUniqueOrThrow({ where: { id: approverId } });
    if (approver.role !== 'APPROVER' || approver.status !== 'ACTIVE') {
      throw new BadRequestException('Assigned user must be an active approver');
    }
    if (!['DRAFT', 'REVISION'].includes(letter.status)) {
      throw new BadRequestException('Only draft or revision letters can be submitted');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedLetter = await tx.letter.update({
        where: { id: letterId },
        data: { status: 'REVIEW', approverId },
      });
      const approval = await tx.approval.create({
        data: { letterId, approverId, status: 'PENDING' },
      });
      return { letter: updatedLetter, approval };
    });
    await this.auditLogs.record(actorId, 'SUBMIT_APPROVAL', 'Letter', letterId, letter, result.letter);
    this.outgoingEvents.emit('letter.updated', { id: result.letter.id, status: result.letter.status });
    return result;
  }

  async approve(actorId: string, letterId: string, dto: ApprovalActionDto) {
    const letter = await this.prisma.letter.findUniqueOrThrow({ where: { id: letterId } });
    if (letter.approverId !== actorId) throw new ForbiddenException('Only assigned approver can approve');
    if (letter.status !== 'REVIEW') throw new BadRequestException('Letter is not in review');

    const result = await this.prisma.$transaction(
      async (tx) => {
        const content = letter.content as Record<string, unknown>;
        const issuedAt = this.numbering.parseLetterDate(content.letter_date);
        const letterMonth = issuedAt.getMonth() + 1;
        const generated =
          letter.letterNumber && letter.sequenceNumber
            ? { letterNumber: letter.letterNumber, sequenceNumber: letter.sequenceNumber }
            : content?.letter_sequence
              ? await this.numbering.generateManualInTransaction(
                  tx,
                  letter.categoryId,
                  letter.letterTypeId,
                  content.letter_sequence,
                  issuedAt,
                )
              : await this.numbering.generateInTransaction(tx, letter.categoryId, letter.letterTypeId, issuedAt);
        const updatedLetter = await tx.letter.update({
          where: { id: letterId },
          data: {
            status: 'APPROVED',
            letterNumber: generated.letterNumber,
            generatedLetterNumber: generated.letterNumber,
            sequenceNumber: generated.sequenceNumber,
            letterDate: issuedAt,
            letterMonth,
            letterYear: issuedAt.getFullYear(),
            letterMonthRoman: this.romanMonth(letterMonth),
            approvedAt: new Date(),
          },
        });
        const approval = await tx.approval.updateMany({
          where: { letterId, approverId: actorId, status: 'PENDING' },
          data: { status: 'APPROVED', notes: dto.notes, approvedAt: new Date() },
        });
        return { letter: updatedLetter, approval };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    await this.auditLogs.record(actorId, 'APPROVE', 'Letter', letterId, letter, result.letter);
    this.outgoingEvents.emit('letter.updated', {
      id: result.letter.id,
      status: result.letter.status,
      letterNumber: result.letter.letterNumber,
    });
    return result;
  }

  private romanMonth(month: number) {
    return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][month - 1];
  }

  async reject(actorId: string, letterId: string, dto: ApprovalActionDto) {
    return this.reviewOutcome(actorId, letterId, dto, 'REJECTED', 'CANCELLED', 'REJECT');
  }

  async requestRevision(actorId: string, letterId: string, dto: ApprovalActionDto) {
    return this.reviewOutcome(actorId, letterId, dto, 'REVISION_REQUESTED', 'REVISION', 'REVISION_REQUEST');
  }

  private async reviewOutcome(
    actorId: string,
    letterId: string,
    dto: ApprovalActionDto,
    approvalStatus: 'REJECTED' | 'REVISION_REQUESTED',
    letterStatus: 'CANCELLED' | 'REVISION',
    action: 'REJECT' | 'REVISION_REQUEST',
  ) {
    const letter = await this.prisma.letter.findUniqueOrThrow({ where: { id: letterId } });
    if (letter.approverId !== actorId) throw new ForbiddenException('Only assigned approver can review');
    if (letter.status !== 'REVIEW') throw new BadRequestException('Letter is not in review');

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedLetter = await tx.letter.update({
        where: { id: letterId },
        data: { status: letterStatus },
      });
      const approval = await tx.approval.updateMany({
        where: { letterId, approverId: actorId, status: 'PENDING' },
        data: { status: approvalStatus, notes: dto.notes },
      });
      return { letter: updatedLetter, approval };
    });
    await this.auditLogs.record(actorId, action, 'Letter', letterId, letter, result.letter);
    this.outgoingEvents.emit('letter.updated', { id: result.letter.id, status: result.letter.status });
    return result;
  }
}
