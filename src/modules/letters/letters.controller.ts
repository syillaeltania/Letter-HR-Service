import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUserDecorator } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AppRole } from '../../common/enums/app-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/types/current-user.type';
import { CreateLetterDto } from './dto/create-letter.dto';
import { LetterQueryDto } from './dto/letter-query.dto';
import { PreviewLetterNumberDto } from './dto/preview-letter-number.dto';
import { UpdateLetterDto } from './dto/update-letter.dto';
import { LettersService } from './letters.service';
import { Response } from 'express';

@ApiTags('Letters')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'letters', version: '1' })
export class LettersController {
  constructor(private readonly letters: LettersService) {}

  @Roles(AppRole.ADMIN_HR, AppRole.STAFF_HR)
  @Post()
  create(@CurrentUserDecorator() user: CurrentUser, @Body() dto: CreateLetterDto) {
    return this.letters.create(user.id, dto);
  }

  @Roles(AppRole.ADMIN_HR, AppRole.STAFF_HR)
  @Post('preview/pdf')
  async previewDraftPdf(@Body() dto: CreateLetterDto, @Res() res: Response) {
    return this.sendInlinePdf(res, await this.letters.previewDraftPdf(dto));
  }

  @Roles(AppRole.ADMIN_HR, AppRole.STAFF_HR)
  @Post('preview/number')
  previewNumber(@Body() dto: PreviewLetterNumberDto) {
    return this.letters.previewNumber(dto);
  }

  @Roles(AppRole.ADMIN_HR, AppRole.STAFF_HR, AppRole.APPROVER, AppRole.VIEWER)
  @Get()
  findAll(@Query() query: LetterQueryDto) {
    return this.letters.findAll(query);
  }

  @Roles(AppRole.ADMIN_HR, AppRole.STAFF_HR, AppRole.APPROVER, AppRole.VIEWER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.letters.findOne(id);
  }

  @Roles(AppRole.ADMIN_HR, AppRole.STAFF_HR)
  @Patch(':id')
  update(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string, @Body() dto: UpdateLetterDto) {
    return this.letters.update(user.id, id, dto);
  }

  @Roles(AppRole.ADMIN_HR, AppRole.STAFF_HR)
  @Delete(':id')
  deleteDraft(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.letters.deleteDraft(user.id, id);
  }

  @Roles(AppRole.ADMIN_HR, AppRole.STAFF_HR, AppRole.APPROVER, AppRole.VIEWER)
  @Get(':id/preview')
  preview(@Param('id') id: string) {
    return this.letters.preview(id);
  }

  @Roles(AppRole.ADMIN_HR, AppRole.STAFF_HR, AppRole.APPROVER, AppRole.VIEWER)
  @Get(':id/preview/pdf')
  async previewPdf(@Param('id') id: string, @Res() res: Response) {
    return this.sendInlinePdf(res, await this.letters.previewPdf(id));
  }

  @Roles(AppRole.ADMIN_HR, AppRole.STAFF_HR)
  @Post(':id/generate/docx')
  generateDocx(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.letters.generateDocx(user.id, id);
  }

  @Roles(AppRole.ADMIN_HR, AppRole.STAFF_HR)
  @Post(':id/generate/pdf')
  generatePdf(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.letters.generatePdf(user.id, id);
  }

  @Roles(AppRole.ADMIN_HR, AppRole.STAFF_HR)
  @Post(':id/publish')
  publish(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.letters.publish(user.id, id);
  }

  private sendInlinePdf(res: Response, filePath: string) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="letter-preview.pdf"');
    return res.sendFile(filePath);
  }
}
