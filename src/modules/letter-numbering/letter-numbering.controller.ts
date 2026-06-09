import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AppRole } from '../../common/enums/app-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { NextSequenceQueryDto } from './dto/next-sequence-query.dto';
import { ValidateSequenceDto } from './dto/validate-sequence.dto';
import { LetterNumberingService } from './letter-numbering.service';

@ApiTags('Letter Numbering')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(AppRole.ADMIN_HR, AppRole.STAFF_HR, AppRole.APPROVER)
@Controller({ path: 'letter-numbering', version: '1' })
export class LetterNumberingController {
  constructor(private readonly numbering: LetterNumberingService) {}

  @Get('next-sequence')
  nextSequence(@Query() query: NextSequenceQueryDto) {
    return this.numbering.nextSequence(query.categoryId, query.letterTypeId, query.letterDate);
  }

  @Post('validate-sequence')
  validateSequence(@Body() dto: ValidateSequenceDto) {
    return this.numbering.validateSequence(dto.categoryId, dto.letterTypeId, dto.letterDate, dto.sequenceNumber);
  }
}
