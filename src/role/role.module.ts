import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleManager } from './domain/role-manager';
import { RoleService } from './application/role.service';
import { RoleController } from './presentation/role.controller';

@Module({
  imports: [],
  controllers: [RoleController],
  providers: [RoleService, RoleManager, PrismaService],
  exports: [RoleService],
})
export class RoleModule {}
