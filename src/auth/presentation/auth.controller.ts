import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../application/auth.service';
import {
  RegisterDto,
  LoginDto,
  ChangePasswordDto,
  RefreshTokenDto,
} from './auth.dtos';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

/**
 * Presentation Layer: NestJS Controller.
 * Kept extremely thin. It only maps incoming HTTP requests to DTOs,
 * invokes the Application Service, and handles domain/application errors by throwing appropriate HTTP exceptions.
 */
@ApiTags('auth')
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
        roleId: user.getRoleId(),
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
      const result = await this.authService.login(dto);
      return {
        message: 'Login successful',
        ...result,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Login failed';
      if (msg.includes('locked') || msg.includes('invalid credentials')) {
        throw new UnauthorizedException(msg);
      }
      throw new BadRequestException(msg);
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  public async refresh(@Body() dto: RefreshTokenDto) {
    try {
      const tokens = await this.authService.refreshTokens(dto.refreshToken);
      return {
        message: 'Tokens refreshed successfully',
        ...tokens,
      };
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Token refresh failed';
      throw new UnauthorizedException(msg);
    }
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  public async logout(
    @CurrentUser('id') userId: string,
    @Body() dto: RefreshTokenDto,
  ) {
    try {
      await this.authService.logout(userId, dto.refreshToken);
      return {
        message: 'Logout successful',
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Logout failed';
      throw new BadRequestException(msg);
    }
  }

  @Post('change-password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  public async changePassword(@Body() dto: ChangePasswordDto) {
    try {
      await this.authService.changePassword(dto);
      return {
        message: 'Password changed successfully. All sessions invalidated.',
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

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  public async getMe(@CurrentUser('id') userId: string) {
    try {
      const user = await this.authService.getMe(userId);
      return {
        message: 'User profile retrieved successfully',
        user,
      };
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Failed to retrieve profile';
      throw new BadRequestException(msg);
    }
  }
}
