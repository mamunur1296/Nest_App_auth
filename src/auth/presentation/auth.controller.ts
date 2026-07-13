import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../application/auth.service';
import { RegisterDto, LoginDto, ChangePasswordDto } from './auth.dtos';

/**
 * Presentation Layer: NestJS Controller.
 * Kept extremely thin. It only maps incoming HTTP requests to DTOs,
 * invokes the Application Service, and handles domain/application errors by throwing appropriate HTTP exceptions.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  public async register(@Body() dto: RegisterDto) {
    try {
      const user = await this.authService.register(dto);
      return {
        message: 'User registered successfully',
        userId: user.getId(),
        email: user.getEmail(),
      };
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Registration failed';
      throw new BadRequestException(msg);
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  public async login(@Body() dto: LoginDto) {
    try {
      const user = await this.authService.login(dto);
      return {
        message: 'Login successful',
        userId: user.getId(),
        email: user.getEmail(),
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Login failed';
      // Map domain locking/unauthorized errors to appropriate status codes
      if (msg.includes('locked') || msg.includes('invalid credentials')) {
        throw new UnauthorizedException(msg);
      }
      throw new BadRequestException(msg);
    }
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  public async changePassword(@Body() dto: ChangePasswordDto) {
    try {
      await this.authService.changePassword(dto);
      return {
        message: 'Password changed successfully',
      };
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Password change failed';
      if (msg.includes('incorrect') || msg.includes('invalid credentials')) {
        throw new UnauthorizedException(msg);
      }
      throw new BadRequestException(msg);
    }
  }
}
