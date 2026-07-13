import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserManager } from './domain/user-manager';
import { AuthService } from './application/auth.service';
import { AuthController } from './presentation/auth.controller';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [AuthService, UserManager, PrismaService],
  exports: [AuthService],
})
export class AuthModule {}
