import { PrismaClient } from '@prisma/client';

async function testRemoteDb(port: number) {
  const url = `postgresql://mercon_dev:98bb95805302af4c966e2c046be986f75351df26@mercon.tech:${port}/mercon_dev_db?schema=public`;
  console.log(`Testing connection to remote DB on port ${port}...`);

  const client = new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
  });

  try {
    await client.$connect();
    console.log(`✅ CONNECTED SUCCESSFULLY to mercon.tech:${port}!`);
    const tables = await client.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log('Tables in mercon_dev_db:', tables);
    await client.$disconnect();
    return true;
  } catch (err: any) {
    console.error(`❌ Failed on port ${port}:`, err.message);
    await client.$disconnect().catch(() => {});
    return false;
  }
}

async function main() {
  const ok15433 = await testRemoteDb(15433);
  if (!ok15433) {
    await testRemoteDb(5432);
  }
}

main();
