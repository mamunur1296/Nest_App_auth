import { Injectable, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { User as DbUser } from '@prisma/client';
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
  ) {}

  /**
   * Rehydrates a database record into a pure Domain Entity.
   */
  private mapToDomain(dbUser: DbUser): User {
    return new User(
      dbUser.id,
      dbUser.email,
      dbUser.password,
      dbUser.failedLoginAttempts,
      dbUser.lockUntil,
      dbUser.createdAt,
    );
  }

  /**
   * Use Case: User Registration
   */
  public async register(dto: RegisterDto): Promise<User> {
    // 1. Application-level validation/check (Check if user exists)
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('Email is already registered.');
    }

    // 2. Call Domain Manager (Factory) to validate and instantiate the User model
    const uuid = randomUUID();
    const domainUser = await this.userManager.createUser(
      uuid,
      dto.email,
      dto.password,
    );

    // 3. Persist the Domain Model state to database
    const savedRecord = await this.prisma.user.create({
      data: {
        id: domainUser.getId(),
        email: domainUser.getEmail(),
        password: domainUser.getPasswordHash(),
        failedLoginAttempts: domainUser.getFailedLoginAttempts(),
        lockUntil: domainUser.getLockUntil(),
        createdAt: domainUser.getCreatedAt(),
      },
    });

    return this.mapToDomain(savedRecord);
  }

  /**
   * Use Case: User Login (with lockout checking)
   */
  public async login(dto: LoginDto): Promise<User> {
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

    return domainUser;
  }

  /**
   * Use Case: Change Password
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
  }
}
