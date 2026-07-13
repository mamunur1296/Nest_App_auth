import { Role as DbRole } from '@prisma/client';
import { Role } from '../domain/role.model';

export class RoleMapper {
  public static toDomain(dbRole: DbRole): Role {
    return new Role(dbRole.id, dbRole.name, dbRole.createdAt);
  }
}
