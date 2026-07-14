export abstract class Entity {
  private readonly _id: string;
  private readonly _createdAt: Date;

  constructor(id: string, createdAt?: Date) {
    this._id = id;
    this._createdAt = createdAt ?? new Date();
  }

  public getId(): string {
    return this._id;
  }

  public getCreatedAt(): Date {
    return this._createdAt;
  }

  public equals(other: Entity): boolean {
    if (other === null || other === undefined) return false;
    if (this === other) return true;
    return this._id === other._id;
  }
}
