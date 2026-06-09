import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUserDecorator } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AppRole } from '../../common/enums/app-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/types/current-user.type';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(AppRole.ADMIN_HR)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  create(@CurrentUserDecorator() user: CurrentUser, @Body() dto: CreateUserDto) {
    return this.users.create(user.id, dto);
  }

  @Get()
  findAll() {
    return this.users.findAll();
  }

  @Roles(AppRole.ADMIN_HR, AppRole.STAFF_HR)
  @Get('approvers')
  findApprovers() {
    return this.users.findApprovers();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Patch(':id')
  update(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(user.id, id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.users.updateStatus(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.users.remove(user.id, id);
  }
}
