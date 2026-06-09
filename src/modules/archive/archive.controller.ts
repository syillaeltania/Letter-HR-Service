import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { AppRole } from '../../common/enums/app-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ArchiveService } from './archive.service';
import { ArchiveQueryDto } from './dto/archive-query.dto';

@ApiTags('Archive')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(AppRole.ADMIN_HR, AppRole.STAFF_HR, AppRole.VIEWER)
@Controller({ path: 'archive', version: '1' })
export class ArchiveController {
  constructor(private readonly archive: ArchiveService) {}

  @Get('letters')
  search(@Query() query: ArchiveQueryDto) {
    return this.archive.search(query);
  }

  @Get('letters/:id/history')
  history(@Param('id') id: string) {
    return this.archive.history(id);
  }

  @Get('letters/:id/download/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    return res.download(await this.archive.getDownloadPath(id, 'pdf'));
  }

  @Get('letters/:id/download/docx')
  async downloadDocx(@Param('id') id: string, @Res() res: Response) {
    return res.download(await this.archive.getDownloadPath(id, 'docx'));
  }
}
