import { Role } from './role.model';

// Domain Service / Factory for Role entity validation and creation.
export class RoleManager {
  public createRole(id: string, name: string): Role {
    return new Role(id, name);
  }
}
