import { AggregateRoot } from './aggregate-root';

export abstract class FullAuditAggregateRoot extends AggregateRoot {
  protected createdBy?: string;
  protected updatedAt?: Date;
  protected updatedBy?: string;
  protected deletedAt?: Date;
  protected deletedBy?: string;
  protected isDeleted: boolean = false;

  constructor(id: string, createdAt?: Date) {
    super(id, createdAt);
  }

  public getCreatedBy(): string | undefined {
    return this.createdBy;
  }

  public setCreatedBy(createdBy: string): void {
    this.createdBy = createdBy;
  }

  public getUpdatedAt(): Date | undefined {
    return this.updatedAt;
  }

  public getUpdatedBy(): string | undefined {
    return this.updatedBy;
  }

  public markUpdated(updatedBy: string): void {
    this.updatedAt = new Date();
    this.updatedBy = updatedBy;
  }

  public getDeletedAt(): Date | undefined {
    return this.deletedAt;
  }

  public getDeletedBy(): string | undefined {
    return this.deletedBy;
  }

  public getIsDeleted(): boolean {
    return this.isDeleted;
  }

  public markDeleted(deletedBy: string): void {
    this.deletedAt = new Date();
    this.deletedBy = deletedBy;
    this.isDeleted = true;
  }

  public restore(): void {
    this.deletedAt = undefined;
    this.deletedBy = undefined;
    this.isDeleted = false;
  }
}
