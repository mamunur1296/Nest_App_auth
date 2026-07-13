import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
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
      role: UserRole.SUPER_ADMIN,
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
