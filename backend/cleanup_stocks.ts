
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing simulated stocks to force fresh fetch...');
  await prisma.stock.deleteMany({
    where: {
      OR: [
        { ticker: 'MRF.NS' },
        { ticker: 'MRF' }
      ]
    }
  });
  console.log('Cleanup complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
