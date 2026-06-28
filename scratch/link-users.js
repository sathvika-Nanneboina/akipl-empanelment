import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();
const prisma = new PrismaClient();

async function main() {
  console.log('Finding contractor users...');
  const users = await prisma.user.findMany({
    where: { role: 'CONTRACTOR' }
  });
  console.log('Contractor users found:', users.map(u => ({ id: u.id, name: u.name, email: u.email })));

  console.log('Finding contractor applications...');
  const applications = await prisma.contractor.findMany();
  console.log('Applications found:', applications.map(a => ({ id: a.id, companyName: a.companyName, userId: a.userId })));

  // If there is a contractor user (like 'sathvika yadav') and a draft/application, link them!
  for (const user of users) {
    // Look for an application that doesn't have a userId yet
    const appToUpdate = applications.find(a => !a.userId && (a.companyName === user.name || a.companyName.includes('AVINASH') || a.companyName.includes('Draft')));
    if (appToUpdate) {
      console.log(`Linking application "${appToUpdate.companyName}" (${appToUpdate.id}) to user "${user.name}" (${user.id})`);
      await prisma.contractor.update({
        where: { id: appToUpdate.id },
        data: { userId: user.id }
      });
    }
  }

  console.log('Link complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
