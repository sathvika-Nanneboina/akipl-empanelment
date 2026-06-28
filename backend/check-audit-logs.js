import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();
const prisma = new PrismaClient();

async function main() {
  console.log('Retrieving recent audit logs...');
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30
  });
  console.log('Recent Audit Logs:', logs.map(l => ({
    id: l.id,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    newValue: l.newValue,
    timestamp: l.timestamp
  })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
