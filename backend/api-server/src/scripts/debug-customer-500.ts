import { prisma } from '../db';
import { getCustomerById } from '../controllers/customerController';

async function run() {
  const anyCustomer = await prisma.customer.findFirst({ where: { deletedAt: null } });
  console.log('Found customer:', anyCustomer?.id, anyCustomer?.name);

  if (anyCustomer) {
    const req: any = {
      params: { id: anyCustomer.id },
    };
    const res: any = {
      status(code: number) {
        console.log('RES STATUS:', code);
        return this;
      },
      json(data: any) {
        console.log('RES JSON:', JSON.stringify(data, null, 2));
        return this;
      },
    };

    await getCustomerById(req, res);
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('UNHANDLED ERROR:', err);
    process.exit(1);
  });
