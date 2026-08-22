const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rateCards = await prisma.rateCard.findMany({
    include: {
      customer: true,
      originLocation: true,
      destinationLocation: true,
    }
  });
  console.log('Total Rate Cards:', rateCards.length);
  for (const rc of rateCards) {
    console.log(JSON.stringify({
      id: rc.id,
      customer: rc.customer?.name,
      origin: rc.route_origin || rc.originLocation?.name,
      destination: rc.route_destination || rc.destinationLocation?.name,
      base_price: rc.base_price,
      vehicle_type: rc.vehicle_type,
      rate_category: rc.rate_category,
      billing_type: rc.billing_type,
      default_trip_charge: rc.default_trip_charge,
      is_active: rc.is_active,
    }, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
