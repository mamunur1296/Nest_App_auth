import { Role } from './role.model';

/**
 * Domain Service / Factory for Role entity validation and creation.
 */
export class RoleManager {
  public createRole(id: string, name: string): Role {
    const validatedName = Role.validateName(name);
    return new Role(id, validatedName);
  }
}
