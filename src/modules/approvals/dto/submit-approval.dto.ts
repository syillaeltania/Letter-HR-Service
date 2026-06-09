import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SubmitApprovalDto {
  @ApiProperty()
  @IsUUID()
  approverId: string;
}
