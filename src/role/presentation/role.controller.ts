import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleService } from '../application/role.service';
import { CreateRoleDto, UpdateRoleDto } from './role.dtos';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';

//Controller exposing CRUD REST endpoints for dynamic Roles.
@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  public async create(@Body() dto: CreateRoleDto) {
    return await this.roleService.create(dto);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  public async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return await this.roleService.findAll(page, limit);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  public async findOne(@Param('id') id: string) {
    return await this.roleService.findOne(id);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  public async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return await this.roleService.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  public async delete(@Param('id') id: string) {
    return await this.roleService.delete(id);
  }
}
