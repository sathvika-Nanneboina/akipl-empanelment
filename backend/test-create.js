import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();
const prisma = new PrismaClient();

async function main() {
  const userId = '151ced19-97d6-4d41-a7d7-2b99b91c25d5'; // sathvika yadav's user ID
  const companyName = 'sathvika yadav';

  try {
    console.log('Testing draft generation...');
    const currentYear = new Date().getFullYear();
    const lastContractor = await prisma.contractor.findFirst({
      where: {
        applicationId: {
          startsWith: `AKIPL-${currentYear}`
        }
      },
      orderBy: { applicationId: 'desc' }
    });

    let sequentialNum = 1;
    if (lastContractor && lastContractor.applicationId.startsWith(`AKIPL-${currentYear}`)) {
      const match = lastContractor.applicationId.match(/-(\d+)$/);
      if (match) {
        sequentialNum = parseInt(match[1]) + 1;
      }
    }

    const paddedNum = String(sequentialNum).padStart(5, '0');
    const newAppId = `AKIPL-${currentYear}-${paddedNum}`;
    console.log('Generated App ID:', newAppId);

    console.log('Creating contractor record in database...');
    const newContractor = await prisma.contractor.create({
      data: {
        userId,
        applicationId: newAppId,
        companyName,
        regNo: '',
        pan: '',
        gst: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        website: '',
        description: '',
        status: 'Draft'
      }
    });

    console.log('Created Contractor Successfully:', newContractor);

    // Clean up test record
    console.log('Cleaning up test record...');
    await prisma.contractor.delete({ where: { id: newContractor.id } });
    console.log('Test record cleaned up!');

  } catch (error) {
    console.error('Error during draft creation:', error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
