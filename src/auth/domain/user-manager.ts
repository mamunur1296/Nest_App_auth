import * as bcrypt from 'bcryptjs';
import { User } from './user.model';

/**
 * Domain Service / Factory responsible for:
 * 1. Instantiating a new User model (Factory pattern).
 * 2. Enforcing domain validations (email format, password strength).
 * 3. Hashing raw passwords using Domain Rules.
 *
 * This layer is independent of any DB or ORM framework.
 */
export class UserManager {
  private readonly BCRYPT_SALT_ROUNDS = 10;
  private readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * Domain validation for Email format.
   */
  public validateEmail(email: string): void {
    if (!email) {
      throw new Error('Email is required.');
    }
    if (!this.EMAIL_REGEX.test(email)) {
      throw new Error('Invalid email format.');
    }
  }

  /**
   * Domain validation for Password strength.
   * Rule: Must be at least 8 characters long, contain a number, and a special character.
   */
  public validatePasswordStrength(password: string): void {
    if (!password) {
      throw new Error('Password is required.');
    }
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    if (!hasNumber || !hasSpecial) {
      throw new Error(
        'Password must contain at least one number and one special character.',
      );
    }
  }

  /**
   * Domain validation for Name.
   */
  public validateName(name: string, fieldName: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error(`${fieldName} is required.`);
    }
  }

  /**
   * Domain validation for Phone Number.
   */
  public validatePhoneNumber(phoneNumber: string): void {
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      throw new Error('Phone number is required.');
    }
    // Basic format check
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 7) {
      throw new Error('Phone number must have at least 7 digits.');
    }
  }

  /**
   * Generates a password hash.
   */
  public async hashPassword(password: string): Promise<string> {
    this.validatePasswordStrength(password);
    return bcrypt.hash(password, this.BCRYPT_SALT_ROUNDS);
  }

  /**
   * Factory method to create a new User domain instance.
   */
  public async createUser(
    id: string,
    email: string,
    passwordPlain: string,
    firstName: string,
    lastName: string,
    phoneNumber: string,
    roleId: string,
  ): Promise<User> {
    this.validateEmail(email);
    this.validateName(firstName, 'First name');
    this.validateName(lastName, 'Last name');
    this.validatePhoneNumber(phoneNumber);
    const passwordHash = await this.hashPassword(passwordPlain);
    return new User(
      id,
      email,
      passwordHash,
      firstName,
      lastName,
      phoneNumber,
      roleId,
    );
  }
}
