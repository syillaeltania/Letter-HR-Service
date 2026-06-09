import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUserDecorator } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AppRole } from '../../common/enums/app-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/types/current-user.type';
import { CreateLetterCategoryDto } from './dto/create-letter-category.dto';
import { CreateLetterTypeDto } from './dto/create-letter-type.dto';
import { UpdateLetterCategoryDto } from './dto/update-letter-category.dto';
import { UpdateLetterTypeDto } from './dto/update-letter-type.dto';
import { LetterCategoriesService } from './letter-categories.service';

@ApiTags('Letter Categories')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(AppRole.ADMIN_HR, AppRole.STAFF_HR)
@Controller({ path: 'letter-categories', version: '1' })
export class LetterCategoriesController {
  constructor(private readonly categories: LetterCategoriesService) {}

  @Post()
  create(@CurrentUserDecorator() user: CurrentUser, @Body() dto: CreateLetterCategoryDto) {
    return this.categories.create(user.id, dto);
  }

  @Get()
  findAll() {
    return this.categories.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categories.findOne(id);
  }

  @Patch(':id')
  update(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: UpdateLetterCategoryDto,
  ) {
    return this.categories.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.categories.remove(user.id, id);
  }

  @Get(':id/types')
  findTypes(@Param('id') id: string) {
    return this.categories.findTypes(id);
  }

  @Post(':id/types')
  createType(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: CreateLetterTypeDto,
  ) {
    return this.categories.createType(user.id, id, dto);
  }

  @Patch(':id/types/:typeId')
  updateType(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Param('typeId') typeId: string,
    @Body() dto: UpdateLetterTypeDto,
  ) {
    return this.categories.updateType(user.id, id, typeId, dto);
  }

  @Delete(':id/types/:typeId')
  removeType(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Param('typeId') typeId: string,
  ) {
    return this.categories.removeType(user.id, id, typeId);
  }
}
