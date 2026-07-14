import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../domain/role.model';
import { RoleManager } from '../domain/role-manager';
import { CreateRoleDto, UpdateRoleDto } from '../presentation/role.dtos';
import { ConflictException } from '../../common/exceptions/conflict.exception';
import { NotFoundException } from '../../common/exceptions/not-found.exception';
import { RoleMapper } from './role.mapper';

//Role Service coordinating CRUD operations.
@Injectable()
export class RoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleManager: RoleManager,
  ) {}

  // Creates a new dynamic Role.
  public async create(
    dto: CreateRoleDto,
  ): Promise<{ message: string; data: Role }> {
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name.toUpperCase() },
    });
    if (existing) {
      throw new ConflictException('Role name already exists.');
    }

    const uuid = randomUUID();
    const domainRole = this.roleManager.createRole(uuid, dto.name);

    const saved = await this.prisma.role.create({
      data: {
        id: domainRole.getId(),
        name: domainRole.getName(),
        createdAt: domainRole.getCreatedAt(),
      },
    });

    return {
      message: 'Role created successfully',
      data: RoleMapper.toDomain(saved),
    };
  }

  // Retrieves all dynamic Roles ordered by name ascending, with optional offset pagination.
  public async findAll(
    pageStr?: string,
    limitStr?: string,
  ): Promise<{
    message: string;
    data: Role[];
    meta?: { total: number; page: number; limit: number };
  }> {
    const page = pageStr ? parseInt(pageStr, 10) : undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;

    if (page !== undefined && limit !== undefined) {
      const skip = (page - 1) * limit;
      const [dbRoles, total] = await Promise.all([
        this.prisma.role.findMany({
          orderBy: { name: 'asc' },
          skip,
          take: limit,
        }),
        this.prisma.role.count(),
      ]);
      return {
        message: 'Roles retrieved successfully',
        data: dbRoles.map((role) => RoleMapper.toDomain(role)),
        meta: {
          total,
          page,
          limit,
        },
      };
    }

    const dbRoles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
    return {
      message: 'Roles retrieved successfully',
      data: dbRoles.map((role) => RoleMapper.toDomain(role)),
    };
  }

  // Retrieves a single dynamic Role by ID.
  public async findOne(id: string): Promise<{ message: string; data: Role }> {
    const dbRole = await this.prisma.role.findUnique({
      where: { id },
    });
    if (!dbRole) {
      throw new NotFoundException('Role not found.');
    }
    return {
      message: 'Role retrieved successfully',
      data: RoleMapper.toDomain(dbRole),
    };
  }

  // Updates a dynamic Role's name.
  public async update(
    id: string,
    dto: UpdateRoleDto,
  ): Promise<{ message: string; data: Role }> {
    const dbRole = await this.prisma.role.findUnique({ where: { id } });
    if (!dbRole) {
      throw new NotFoundException('Role not found.');
    }

    const domainRole = RoleMapper.toDomain(dbRole);
    domainRole.updateName(dto.name);

    const existing = await this.prisma.role.findUnique({
      where: { name: domainRole.getName() },
    });
    if (existing && existing.id !== id) {
      throw new ConflictException('Role name already in use by another role.');
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        name: domainRole.getName(),
      },
    });

    return {
      message: 'Role updated successfully',
      data: RoleMapper.toDomain(updated),
    };
  }

  // Deletes a dynamic Role.
  public async delete(id: string): Promise<{ message: string }> {
    const dbRole = await this.prisma.role.findUnique({
      where: { id },
      include: { users: true },
    });
    if (!dbRole) {
      throw new NotFoundException('Role not found.');
    }

    const domainRole = RoleMapper.toDomain(dbRole);
    domainRole.assertCanDelete(dbRole.users.length);

    await this.prisma.role.delete({
      where: { id },
    });

    return {
      message: 'Role deleted successfully',
    };
  }
}
