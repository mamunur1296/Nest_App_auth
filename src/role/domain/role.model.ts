/**
 * Domain Entity representing a Role.
 */
export class Role {
  private readonly id: string;
  private readonly name: string;
  private readonly createdAt: Date;

  constructor(id: string, name: string, createdAt = new Date()) {
    this.id = id;
    this.name = name;
    this.createdAt = createdAt;
  }

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  /**
   * Domain validation: Ensure name is not empty and is uppercase.
   */
  public static validateName(name: string): string {
    if (!name || name.trim().length === 0) {
      throw new Error('Role name is required.');
    }
    return name.trim().toUpperCase();
  }
}
