import { PrismaClient } from '../generated/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@helpmytravel.com' },
    update: {},
    create: {
      email: 'admin@helpmytravel.com',
      name: 'Admin',
      password: adminPassword,
      language: 'en',
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // Create test user
  const userPassword = await bcrypt.hash('user123!', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@helpmytravel.com' },
    update: {},
    create: {
      email: 'user@helpmytravel.com',
      name: 'Test User',
      password: userPassword,
      language: 'pt',
      role: 'USER',
    },
  });
  console.log(`✅ Test user created: ${user.email}`);

  console.log('🎉 Seed completed!');
  console.log('');
  console.log('Default credentials:');
  console.log('  Admin: admin@helpmytravel.com / admin123!');
  console.log('  User:  user@helpmytravel.com  / user123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
