import { FullAuditAggregateRoot } from '../../common/domain/full-audit-aggregate-root';
import { ValidationException } from '../../common/exceptions/validation.exception';
import { ForbiddenException } from '../../common/exceptions/forbidden.exception';
import { ConflictException } from '../../common/exceptions/conflict.exception';

// Domain Entity representing a Role.
export class Role extends FullAuditAggregateRoot {
  private name: string;

  constructor(id: string, name: string, createdAt?: Date) {
    super(id, createdAt);
    this.name = Role.validateName(name);
  }

  public updateName(name: string): void {
    this.name = Role.validateName(name);
  }

  public getName(): string {
    return this.name;
  }

  public isSystemRole(): boolean {
    const protectedRoles = ['SUPER_ADMIN', 'ADMIN', 'USER'];
    return protectedRoles.includes(this.name);
  }

  public assertCanDelete(usersCount: number): void {
    if (this.isSystemRole()) {
      throw new ForbiddenException('Cannot delete critical system role.');
    }
    if (usersCount > 0) {
      throw new ConflictException(
        'Cannot delete role because it is currently assigned to users.',
      );
    }
  }

  // Domain validation: Ensure name is not empty and is uppercase.
  public static validateName(name: string): string {
    if (!name || name.trim().length === 0) {
      throw new ValidationException('Role name is required.');
    }
    return name.trim().toUpperCase();
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.getId(),
      name: this.name,
      createdAt: this.getCreatedAt(),
    };
  }
}
