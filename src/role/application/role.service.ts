import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Role as DbRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../domain/role.model';
import { RoleManager } from '../domain/role-manager';
import { CreateRoleDto, UpdateRoleDto } from '../presentation/role.dtos';

/**
 * Role Service coordinating CRUD operations.
 */
@Injectable()
export class RoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleManager: RoleManager,
  ) {}

  private mapToDomain(dbRole: DbRole): Role {
    return new Role(dbRole.id, dbRole.name, dbRole.createdAt);
  }

  public async create(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name.toUpperCase() },
    });
    if (existing) {
      throw new BadRequestException('Role name already exists.');
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

    return this.mapToDomain(saved);
  }

  public async findAll(): Promise<Role[]> {
    const dbRoles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
    return dbRoles.map((role) => this.mapToDomain(role));
  }

  public async findOne(id: string): Promise<Role> {
    const dbRole = await this.prisma.role.findUnique({
      where: { id },
    });
    if (!dbRole) {
      throw new NotFoundException('Role not found.');
    }
    return this.mapToDomain(dbRole);
  }

  public async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const dbRole = await this.prisma.role.findUnique({ where: { id } });
    if (!dbRole) {
      throw new NotFoundException('Role not found.');
    }

    const uppercaseName = dto.name.toUpperCase();
    const existing = await this.prisma.role.findUnique({
      where: { name: uppercaseName },
    });
    if (existing && existing.id !== id) {
      throw new BadRequestException(
        'Role name already in use by another role.',
      );
    }

    const domainRole = this.roleManager.createRole(id, dto.name);

    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        name: domainRole.getName(),
      },
    });

    return this.mapToDomain(updated);
  }

  public async delete(id: string): Promise<void> {
    const dbRole = await this.prisma.role.findUnique({
      where: { id },
      include: { users: true },
    });
    if (!dbRole) {
      throw new NotFoundException('Role not found.');
    }

    if (dbRole.users.length > 0) {
      throw new BadRequestException(
        'Cannot delete role because it is currently assigned to users.',
      );
    }

    const protectedRoles = ['SUPER_ADMIN', 'ADMIN', 'USER'];
    if (protectedRoles.includes(dbRole.name)) {
      throw new BadRequestException('Cannot delete critical system role.');
    }

    await this.prisma.role.delete({
      where: { id },
    });
  }
}
