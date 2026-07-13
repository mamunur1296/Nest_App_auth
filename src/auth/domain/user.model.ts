import * as bcrypt from 'bcryptjs';

/**
 * Domain Entity representing a User.
 * This class is pure TypeScript, free of framework decorators, database schemas, or ORM annotations.
 * It encapsulates the core business invariants, rules, and behaviors of a User.
 */
export class User {
  private readonly id: string;
  private readonly email: string;
  private passwordHash: string;
  private readonly firstName: string;
  private readonly lastName: string;
  private readonly phoneNumber: string;
  private readonly roleId: string;
  private failedLoginAttempts: number;
  private lockUntil: Date | null;
  private readonly createdAt: Date;

  constructor(
    id: string,
    email: string,
    passwordHash: string,
    firstName: string,
    lastName: string,
    phoneNumber: string,
    roleId: string,
    failedLoginAttempts = 0,
    lockUntil: Date | null = null,
    createdAt = new Date(),
  ) {
    this.id = id;
    this.email = email;
    this.passwordHash = passwordHash;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phoneNumber = phoneNumber;
    this.roleId = roleId;
    this.failedLoginAttempts = failedLoginAttempts;
    this.lockUntil = lockUntil;
    this.createdAt = createdAt;
  }

  // Getters to expose state safely (read-only)
  public getId(): string {
    return this.id;
  }

  public getEmail(): string {
    return this.email;
  }

  public getPasswordHash(): string {
    return this.passwordHash;
  }

  public getFirstName(): string {
    return this.firstName;
  }

  public getLastName(): string {
    return this.lastName;
  }

  public getPhoneNumber(): string {
    return this.phoneNumber;
  }

  public getRoleId(): string {
    return this.roleId;
  }

  public getFailedLoginAttempts(): number {
    return this.failedLoginAttempts;
  }

  public getLockUntil(): Date | null {
    return this.lockUntil;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  /**
   * Verifies if the provided plain-text password matches the User's password hash.
   */
  public async verifyPassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }

  /**
   * Domain rule: Check if the user account is locked.
   */
  public isLocked(): boolean {
    if (!this.lockUntil) {
      return false;
    }
    return new Date() < this.lockUntil;
  }

  /**
   * Domain rule: Record a failed login attempt.
   * If failed attempts reach 5, lock the account for 15 minutes.
   */
  public recordFailedLoginAttempt(): void {
    this.failedLoginAttempts += 1;
    if (this.failedLoginAttempts >= 5) {
      // Lock for 15 minutes
      this.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
  }

  /**
   * Domain rule: Reset failed attempts upon successful login/unlock.
   */
  public resetFailedAttempts(): void {
    this.failedLoginAttempts = 0;
    this.lockUntil = null;
  }

  /**
   * Domain rule: Update the user's password with a new pre-computed hash.
   */
  public changePassword(newHash: string): void {
    if (!newHash) {
      throw new Error('Password hash cannot be empty.');
    }
    this.passwordHash = newHash;
    // Password change resets login lock/attempts as it proves ownership/recovery
    this.resetFailedAttempts();
  }
}
