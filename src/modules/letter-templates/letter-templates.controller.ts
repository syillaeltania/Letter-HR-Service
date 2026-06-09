import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUserDecorator } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AppRole } from '../../common/enums/app-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/types/current-user.type';
import { CreateLetterTemplateDto } from './dto/create-letter-template.dto';
import { UpdateLetterTemplateDto } from './dto/update-letter-template.dto';
import { LetterTemplatesService } from './letter-templates.service';

@ApiTags('Letter Templates')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(AppRole.ADMIN_HR, AppRole.STAFF_HR)
@Controller({ path: 'letter-templates', version: '1' })
export class LetterTemplatesController {
  constructor(private readonly templates: LetterTemplatesService) {}

  @Post()
  create(@CurrentUserDecorator() user: CurrentUser, @Body() dto: CreateLetterTemplateDto) {
    return this.templates.create(user.id, dto);
  }

  @Get()
  findAll(@Query('categoryId') categoryId?: string) {
    return this.templates.findAll(categoryId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templates.findOne(id);
  }

  @Patch(':id')
  update(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string, @Body() dto: UpdateLetterTemplateDto) {
    return this.templates.update(user.id, id, dto);
  }

  @Post(':id/versions')
  createVersion(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: UpdateLetterTemplateDto,
  ) {
    return this.templates.createVersion(user.id, id, dto);
  }

  @Post(':id/upload-docx')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocx(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.templates.uploadDocx(user.id, id, file);
  }

  @Delete(':id')
  remove(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.templates.remove(user.id, id);
  }
}
