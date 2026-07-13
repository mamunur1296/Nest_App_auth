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
    const role = await this.roleService.create(dto);
    return {
      message: 'Role created successfully',
      data: role,
    };
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  public async findAll() {
    const roles = await this.roleService.findAll();
    return {
      message: 'Roles retrieved successfully',
      data: roles,
    };
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  public async findOne(@Param('id') id: string) {
    const role = await this.roleService.findOne(id);
    return {
      message: 'Role retrieved successfully',
      data: role,
    };
  }

  @Put(':id')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  public async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    const role = await this.roleService.update(id, dto);
    return {
      message: 'Role updated successfully',
      data: role,
    };
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  public async delete(@Param('id') id: string) {
    await this.roleService.delete(id);
    return {
      message: 'Role deleted successfully',
    };
  }
}
