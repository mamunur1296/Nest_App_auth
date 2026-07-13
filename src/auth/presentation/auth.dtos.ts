import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { UserRole } from '@prisma/client';

/**
 * Data Transfer Object for Registration request.
 */
export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @IsString({ message: 'Confirm password must be a string' })
  @IsNotEmpty({ message: 'Confirm password is required' })
  confirmPassword!: string;

  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  firstName!: string;

  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  lastName!: string;

  @IsString({ message: 'Phone number must be a string' })
  @IsNotEmpty({ message: 'Phone number is required' })
  phoneNumber!: string;

  @IsEnum(UserRole, { message: 'Invalid user role' })
  @IsOptional()
  role?: UserRole;
}

/**
 * Data Transfer Object for Login request.
 */
export class LoginDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;
}

/**
 * Data Transfer Object for Change Password request.
 */
export class ChangePasswordDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @IsString({ message: 'Old password must be a string' })
  @IsNotEmpty({ message: 'Old password is required' })
  oldPassword!: string;

  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  newPassword!: string;
}

/**
 * Data Transfer Object for Refresh Token request.
 */
export class RefreshTokenDto {
  @IsString({ message: 'Refresh token must be a string' })
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken!: string;
}
