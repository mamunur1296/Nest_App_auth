import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const defaultRoles = ['SUPER_ADMIN', 'ADMIN', 'USER', 'STUDENT', 'TEACHER'];

  console.log('🌱 Seeding roles...');
  const roleMap: Record<string, string> = {};

  for (const roleName of defaultRoles) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
    roleMap[roleName] = role.id;
    console.log(`- Role: ${roleName} (ID: ${role.id})`);
  }

  const email = 'superadmin@system.com';
  const password = 'SuperAdminPassword123!';
  const phoneNumber = '01700000000';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('✅ Super admin already exists');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      phoneNumber,
      roleId: roleMap['SUPER_ADMIN'],
    },
  });

  console.log(`✅ Super admin created with email: ${email}`);
  console.log(`⚠️  Default password: ${password}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
