import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const password = 'password123';
  const password_hash = await bcrypt.hash(password, 10);

  // Upsert the admin user. If it already exists (e.g. seeded by an older
  // version with the wrong role), fix its role without touching the password.
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { role: Role.Admin, isActive: true },
    create: {
      username: 'admin',
      password_hash,
      name: 'Mercon Admin',
      role: Role.Admin,
      isActive: true
    }
  });
  console.log(`👤 Admin user ready: ${admin.username} (role: ${admin.role})`);

  // Create a default operator user if one doesn't exist yet.
  // Only the role is enforced on updates so a changed password is preserved.
  const operator = await prisma.user.upsert({
    where: { username: 'operator' },
    update: { role: Role.Operator, isActive: true },
    create: {
      username: 'operator',
      password_hash,
      name: 'Mercon Operator',
      role: Role.Operator,
      isActive: true
    }
  });
  console.log(`👤 Operator user ready: ${operator.username} (role: ${operator.role})`);

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
