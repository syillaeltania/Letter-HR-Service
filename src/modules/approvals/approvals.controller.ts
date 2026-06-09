import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUserDecorator } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AppRole } from '../../common/enums/app-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/types/current-user.type';
import { ApprovalActionDto } from './dto/approval-action.dto';
import { SubmitApprovalDto } from './dto/submit-approval.dto';
import { ApprovalsService } from './approvals.service';

@ApiTags('Approvals')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'approvals', version: '1' })
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Roles(AppRole.ADMIN_HR, AppRole.STAFF_HR)
  @Post('submit/:letterId')
  submit(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('letterId') letterId: string,
    @Body() dto: SubmitApprovalDto,
  ) {
    return this.approvals.submit(user.id, letterId, dto.approverId);
  }

  @Roles(AppRole.APPROVER)
  @Post(':letterId/approve')
  approve(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('letterId') letterId: string,
    @Body() dto: ApprovalActionDto,
  ) {
    return this.approvals.approve(user.id, letterId, dto);
  }

  @Roles(AppRole.APPROVER)
  @Post(':letterId/reject')
  reject(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('letterId') letterId: string,
    @Body() dto: ApprovalActionDto,
  ) {
    return this.approvals.reject(user.id, letterId, dto);
  }

  @Roles(AppRole.APPROVER)
  @Post(':letterId/revision')
  revision(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('letterId') letterId: string,
    @Body() dto: ApprovalActionDto,
  ) {
    return this.approvals.requestRevision(user.id, letterId, dto);
  }
}
