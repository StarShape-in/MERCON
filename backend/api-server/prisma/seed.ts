import { PrismaClient, Role, DriverStatus, AssetStatus, AssetType, TripStatus, StopType, InvoiceStatus, DocType, DocStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create default Operator User
  const password = 'password123';
  const password_hash = await bcrypt.hash(password, 10);

  const existingAdmin = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (existingAdmin) {
    console.log("Database already seeded. Skipping.");
    return;
  }

  const user = await prisma.user.create({
    data: {
      username: 'admin',
      password_hash,
      name: 'Mercon Admin',
      role: Role.Operator,
      isActive: true
    }
  });
  console.log(`👤 Created Operator User: ${user.username} (Password: ${password})`);

  // We have removed the fake data seeding for drivers, trips, customers, etc.
  // The database will now remain empty aside from the admin user above.

  console.log('✅ Database seeded successfully with only the admin user!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
