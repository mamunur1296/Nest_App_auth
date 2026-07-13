import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { User as DbUser, UserRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { User } from '../domain/user.model';
import { UserManager } from '../domain/user-manager';
import {
  RegisterDto,
  LoginDto,
  ChangePasswordDto,
} from '../presentation/auth.dtos';

/**
 * Application Service: Coordinates core use cases.
 * Handles database interaction (via Prisma Client), rehydrates raw database records
 * into the pure Domain Entity (User), executes business logic on domain structures,
 * and persists updated entity state back to PostgreSQL.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userManager: UserManager,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Rehydrates a database record into a pure Domain Entity.
   */
  private mapToDomain(dbUser: DbUser): User {
    return new User(
      dbUser.id,
      dbUser.email,
      dbUser.password,
      dbUser.firstName,
      dbUser.lastName,
      dbUser.phoneNumber,
      dbUser.role,
      dbUser.failedLoginAttempts,
      dbUser.lockUntil,
      dbUser.createdAt,
    );
  }

  /**
   * Use Case: User Registration
   */
  public async register(dto: RegisterDto): Promise<User> {
    // 1. Password confirmation check
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    // 2. Application-level validation/check (Check if user exists)
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('Email is already registered.');
    }

    // 3. Call Domain Manager (Factory) to validate and instantiate the User model
    const uuid = randomUUID();
    const domainUser = await this.userManager.createUser(
      uuid,
      dto.email,
      dto.password,
      dto.firstName,
      dto.lastName,
      dto.phoneNumber,
      dto.role || UserRole.USER,
    );

    // 4. Persist the Domain Model state to database
    const savedRecord = await this.prisma.user.create({
      data: {
        id: domainUser.getId(),
        email: domainUser.getEmail(),
        password: domainUser.getPasswordHash(),
        firstName: domainUser.getFirstName(),
        lastName: domainUser.getLastName(),
        phoneNumber: domainUser.getPhoneNumber(),
        role: domainUser.getRole(),
        failedLoginAttempts: domainUser.getFailedLoginAttempts(),
        lockUntil: domainUser.getLockUntil(),
        createdAt: domainUser.getCreatedAt(),
      },
    });

    return this.mapToDomain(savedRecord);
  }

  /**
   * Use Case: User Login (with lockout checking & JWT token generation)
   */
  public async login(dto: LoginDto) {
    // 1. Retrieve the raw user data
    const dbUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!dbUser) {
      throw new BadRequestException('Invalid credentials.');
    }

    // 2. Rehydrate the Domain Entity
    const domainUser = this.mapToDomain(dbUser);

    // 3. Execute Domain Rules
    if (domainUser.isLocked()) {
      const lockUntil = domainUser.getLockUntil();
      const minutesLeft = lockUntil
        ? Math.ceil((lockUntil.getTime() - Date.now()) / (60 * 1000))
        : 15;
      throw new BadRequestException(
        `Account is locked. Please try again in ${minutesLeft} minute(s).`,
      );
    }

    const isValidPassword = await domainUser.verifyPassword(dto.password);
    if (!isValidPassword) {
      // Perform state mutation through the domain entity behaviors
      domainUser.recordFailedLoginAttempt();

      // Persist mutated state
      await this.prisma.user.update({
        where: { id: domainUser.getId() },
        data: {
          failedLoginAttempts: domainUser.getFailedLoginAttempts(),
          lockUntil: domainUser.getLockUntil(),
        },
      });

      if (domainUser.isLocked()) {
        throw new BadRequestException(
          'Too many failed attempts. Account has been locked for 15 minutes.',
        );
      }
      throw new BadRequestException('Invalid credentials.');
    }

    // If login is successful, reset failed attempts inside the domain
    domainUser.resetFailedAttempts();
    await this.prisma.user.update({
      where: { id: domainUser.getId() },
      data: {
        failedLoginAttempts: domainUser.getFailedLoginAttempts(),
        lockUntil: domainUser.getLockUntil(),
      },
    });

    // Generate JWT tokens
    const tokens = await this.generateTokens(
      domainUser.getId(),
      domainUser.getEmail(),
      domainUser.getRole(),
    );

    // Remove password hash from user response object
    const userResponse = {
      id: domainUser.getId(),
      email: domainUser.getEmail(),
      firstName: domainUser.getFirstName(),
      lastName: domainUser.getLastName(),
      phoneNumber: domainUser.getPhoneNumber(),
      role: domainUser.getRole(),
      createdAt: domainUser.getCreatedAt(),
    };

    return { user: userResponse, ...tokens };
  }

  /**
   * Use Case: Refresh Token Rotation
   */
  public async refreshTokens(refreshToken: string) {
    let payload: { sub: string; email: string; role: UserRole };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or not found');
    }

    // Rotate refresh token (Delete current token, generate new pair)
    await this.prisma.refreshToken.delete({ where: { token: refreshToken } });

    const tokens = await this.generateTokens(
      payload.sub,
      payload.email,
      payload.role,
    );

    return tokens;
  }

  /**
   * Use Case: User Logout
   */
  public async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId, token: refreshToken },
      });
    } else {
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
    }
    return { message: 'Logged out successfully' };
  }

  /**
   * Use Case: Change Password (invalidates all active sessions)
   */
  public async changePassword(dto: ChangePasswordDto): Promise<void> {
    // 1. Retrieve raw user data
    const dbUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!dbUser) {
      throw new BadRequestException('User not found.');
    }

    // 2. Rehydrate the Domain Entity
    const domainUser = this.mapToDomain(dbUser);

    // 3. Validate old password
    const isOldPasswordCorrect = await domainUser.verifyPassword(
      dto.oldPassword,
    );
    if (!isOldPasswordCorrect) {
      throw new BadRequestException('Incorrect current password.');
    }

    // 4. Validate and hash new password using UserManager rules
    const newPasswordHash = await this.userManager.hashPassword(
      dto.newPassword,
    );

    // 5. Update Domain Model State
    domainUser.changePassword(newPasswordHash);

    // 6. Persist changes
    await this.prisma.user.update({
      where: { id: domainUser.getId() },
      data: {
        password: domainUser.getPasswordHash(),
        failedLoginAttempts: domainUser.getFailedLoginAttempts(),
        lockUntil: domainUser.getLockUntil(),
      },
    });

    // 7. Invalidate all active refresh tokens/sessions
    await this.prisma.refreshToken.deleteMany({
      where: { userId: domainUser.getId() },
    });
  }

  /**
   * Use Case: Get User Profile (Me)
   */
  public async getMe(userId: string) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!dbUser) {
      throw new NotFoundException('User not found');
    }
    const domainUser = this.mapToDomain(dbUser);
    return {
      id: domainUser.getId(),
      email: domainUser.getEmail(),
      firstName: domainUser.getFirstName(),
      lastName: domainUser.getLastName(),
      phoneNumber: domainUser.getPhoneNumber(),
      role: domainUser.getRole(),
      createdAt: domainUser.getCreatedAt(),
    };
  }

  /**
   * Helper: Generates access and refresh tokens, stores refresh token in database
   */
  private async generateTokens(userId: string, email: string, role: UserRole) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      }),
    ]);

    // Save refresh token to db with expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Matches default 7d

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
      },
    });

    // Cleanup old tokens (keep last 5 sessions max)
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (tokens.length > 5) {
      const toDelete = tokens.slice(5).map((t) => t.id);
      await this.prisma.refreshToken.deleteMany({
        where: { id: { in: toDelete } },
      });
    }

    return { accessToken, refreshToken };
  }
}
