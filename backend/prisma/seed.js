import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  // Delete in order to satisfy FK constraints
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.evaluation.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.projectReference.deleteMany({});
  await prisma.financialDetail.deleteMany({});
  await prisma.technicalDetail.deleteMany({});
  await prisma.contractor.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Creating users...');
  
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('admin123', salt);
  const staffPasswordHash = await bcrypt.hash('staff123', salt);
  const contractorPasswordHash = await bcrypt.hash('contractor123', salt);

  const admin = await prisma.user.create({
    data: {
      name: 'Aditya Kanaparthi',
      email: 'admin@akipl.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=120',
      isActive: true
    }
  });

  const staff = await prisma.user.create({
    data: {
      name: 'Rohan Sharma',
      email: 'staff@akipl.com',
      passwordHash: staffPasswordHash,
      role: 'STAFF',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120',
      isActive: true
    }
  });

  const staff2 = await prisma.user.create({
    data: {
      name: 'Priya Patel',
      email: 'priya@akipl.com',
      passwordHash: staffPasswordHash,
      role: 'STAFF',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120',
      isActive: true
    }
  });

  const externalContractor = await prisma.user.create({
    data: {
      name: 'GMR Infra Developer',
      email: 'contractor@akipl.com',
      passwordHash: contractorPasswordHash,
      role: 'CONTRACTOR',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
      isActive: true
    }
  });

  console.log('Creating contractors and vendor profiles...');

  const categoriesList = [
    'Civil Works',
    'Electrical Systems',
    'Plumbing & Piping',
    'HVAC & Mechanical',
    'Structural Steel',
    'Roads & Paving',
    'Interior & Fit-out'
  ];

  const states = ['Andhra Pradesh', 'Telangana', 'Karnataka', 'Tamil Nadu', 'Maharashtra', 'Delhi'];
  const cities = {
    'Andhra Pradesh': ['Vijayawada', 'Vishakhapatnam', 'Guntur', 'Tirupati'],
    'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad'],
    'Karnataka': ['Bangalore', 'Mysore', 'Hubli'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur'],
    'Delhi': ['New Delhi']
  };

  const contractorsData = [
    {
      companyName: 'Apex Civil Constructors Ltd',
      status: 'Approved',
      city: 'Hyderabad',
      state: 'Telangana',
      category: 'Civil Works',
      turnover: 150000000, // 15 Cr
      safetyScore: 92,
      evaluation: { tech: 88, fin: 85, ref: 90 },
      isBlacklisted: 'No'
    },
    {
      companyName: 'ElectroVolt Systems Pvt Ltd',
      status: 'Approved',
      city: 'Bangalore',
      state: 'Karnataka',
      category: 'Electrical Systems',
      turnover: 85000000, // 8.5 Cr
      safetyScore: 88,
      evaluation: { tech: 84, fin: 78, ref: 80 },
      isBlacklisted: 'No'
    },
    {
      companyName: 'Saraswati Plumbing & Piping',
      status: 'Approved',
      city: 'Vijayawada',
      state: 'Andhra Pradesh',
      category: 'Plumbing & Piping',
      turnover: 42000000, // 4.2 Cr
      safetyScore: 85,
      evaluation: { tech: 78, fin: 70, ref: 82 },
      isBlacklisted: 'No'
    },
    {
      companyName: 'Vardhman HVAC Engineers',
      status: 'Approved',
      city: 'Mumbai',
      state: 'Maharashtra',
      category: 'HVAC & Mechanical',
      turnover: 98000000, // 9.8 Cr
      safetyScore: 90,
      evaluation: { tech: 82, fin: 84, ref: 85 },
      isBlacklisted: 'No'
    },
    {
      companyName: 'Hindustan Structural Steel Corp',
      status: 'Approved',
      city: 'Chennai',
      state: 'Tamil Nadu',
      category: 'Structural Steel',
      turnover: 180000000, // 18 Cr
      safetyScore: 82,
      evaluation: { tech: 80, fin: 88, ref: 78 },
      isBlacklisted: 'No'
    },
    {
      companyName: 'South India Roads Pvt Ltd',
      status: 'Approved',
      city: 'Vishakhapatnam',
      state: 'Andhra Pradesh',
      category: 'Roads & Paving',
      turnover: 120000000, // 12 Cr
      safetyScore: 95,
      evaluation: { tech: 92, fin: 80, ref: 94 },
      isBlacklisted: 'No'
    },
    {
      companyName: 'DecoStyle Interior & Fit-outs',
      status: 'Approved',
      city: 'Bangalore',
      state: 'Karnataka',
      category: 'Interior & Fit-out',
      turnover: 35000000, // 3.5 Cr
      safetyScore: 80,
      evaluation: { tech: 75, fin: 72, ref: 80 },
      isBlacklisted: 'No'
    },
    {
      companyName: 'Rayalaseema Earth Movers',
      status: 'Approved',
      city: 'Tirupati',
      state: 'Andhra Pradesh',
      category: 'Civil Works',
      turnover: 65000000, // 6.5 Cr
      safetyScore: 87,
      evaluation: { tech: 81, fin: 76, ref: 83 },
      isBlacklisted: 'No'
    },
    {
      companyName: 'BrightWire Electricals',
      status: 'Approved',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      category: 'Electrical Systems',
      turnover: 48000000, // 4.8 Cr
      safetyScore: 86,
      evaluation: { tech: 79, fin: 73, ref: 75 },
      isBlacklisted: 'No'
    },
    {
      companyName: 'Matrix HVAC Systems',
      status: 'Approved',
      city: 'Pune',
      state: 'Maharashtra',
      category: 'HVAC & Mechanical',
      turnover: 110000000, // 11 Cr
      safetyScore: 91,
      evaluation: { tech: 89, fin: 82, ref: 88 },
      isBlacklisted: 'No'
    },
    {
      companyName: 'Kalyani Infrastructure Pvt Ltd',
      status: 'Under Review',
      city: 'Hyderabad',
      state: 'Telangana',
      category: 'Civil Works',
      turnover: 135000000, // 13.5 Cr
      safetyScore: 80,
      evaluation: null,
      isBlacklisted: 'No'
    },
    {
      companyName: 'Supreme Plumbing Utilities',
      status: 'Technical Evaluation',
      city: 'New Delhi',
      state: 'Delhi',
      category: 'Plumbing & Piping',
      turnover: 28000000, // 2.8 Cr
      safetyScore: 78,
      evaluation: null,
      isBlacklisted: 'No'
    },
    {
      companyName: 'Delta Steel Fabricators',
      status: 'Financial Check',
      city: 'Nagpur',
      state: 'Maharashtra',
      category: 'Structural Steel',
      turnover: 54000000, // 5.4 Cr
      safetyScore: 84,
      evaluation: null,
      isBlacklisted: 'No'
    },
    {
      companyName: 'National Paving Co.',
      status: 'Under Review',
      city: 'Mysore',
      state: 'Karnataka',
      category: 'Roads & Paving',
      turnover: 72000000, // 7.2 Cr
      safetyScore: 83,
      evaluation: null,
      isBlacklisted: 'No'
    },
    {
      companyName: 'Elite Spaces Fit-outs',
      status: 'Submitted',
      city: 'Mumbai',
      state: 'Maharashtra',
      category: 'Interior & Fit-out',
      turnover: 21000000, // 2.1 Cr
      safetyScore: 82,
      evaluation: null,
      isBlacklisted: 'No'
    },
    {
      companyName: 'Balaji Civil Projects',
      status: 'Rejected',
      city: 'Warangal',
      state: 'Telangana',
      category: 'Civil Works',
      turnover: 15000000, // 1.5 Cr (Too low)
      safetyScore: 45, // Bad safety
      evaluation: { tech: 40, fin: 45, ref: 50 },
      isBlacklisted: 'No'
    },
    {
      companyName: 'PowerGrid Solutions (India)',
      status: 'Resubmit Required',
      city: 'Nizamabad',
      state: 'Telangana',
      category: 'Electrical Systems',
      turnover: 52000000,
      safetyScore: 75,
      evaluation: null,
      isBlacklisted: 'No'
    },
    {
      companyName: 'Vikas Earth & Roads Ltd',
      status: 'Approved',
      city: 'Guntur',
      state: 'Andhra Pradesh',
      category: 'Roads & Paving',
      turnover: 95000000,
      safetyScore: 89,
      evaluation: { tech: 83, fin: 80, ref: 86 },
      isBlacklisted: 'No'
    },
    {
      companyName: 'Premier Piping & Fitting',
      status: 'Draft',
      city: 'Chennai',
      state: 'Tamil Nadu',
      category: 'Plumbing & Piping',
      turnover: 18000000,
      safetyScore: 72,
      evaluation: null,
      isBlacklisted: 'No'
    },
    {
      companyName: 'TechnoTemp Controls',
      status: 'Submitted',
      city: 'Hyderabad',
      state: 'Telangana',
      category: 'HVAC & Mechanical',
      turnover: 67000000,
      safetyScore: 88,
      evaluation: null,
      isBlacklisted: 'No'
    },
    {
      companyName: 'Falcon Heavy Lift & Erectors',
      status: 'Approved',
      city: 'Vizag',
      state: 'Andhra Pradesh',
      category: 'Structural Steel',
      turnover: 145000000,
      safetyScore: 90,
      evaluation: { tech: 86, fin: 82, ref: 85 },
      isBlacklisted: 'No'
    },
    {
      companyName: 'Karan Design & Woodworks',
      status: 'Draft',
      city: 'Pune',
      state: 'Maharashtra',
      category: 'Interior & Fit-out',
      turnover: 12000000,
      safetyScore: 68,
      evaluation: null,
      isBlacklisted: 'No'
    },
    {
      companyName: 'Blacklisted Infra Corp',
      status: 'Rejected',
      city: 'Mumbai',
      state: 'Maharashtra',
      category: 'Civil Works',
      turnover: 80000000,
      safetyScore: 30,
      evaluation: { tech: 35, fin: 70, ref: 40 },
      isBlacklisted: 'Yes'
    },
    {
      companyName: 'Universal Power Solutions',
      status: 'Technical Evaluation',
      city: 'Bangalore',
      state: 'Karnataka',
      category: 'Electrical Systems',
      turnover: 110000000,
      safetyScore: 85,
      evaluation: null,
      isBlacklisted: 'No'
    },
    {
      companyName: 'Subhadra Infratech',
      status: 'Approved',
      city: 'Vijayawada',
      state: 'Andhra Pradesh',
      category: 'Civil Works',
      turnover: 210000000, // 21 Cr
      safetyScore: 93,
      evaluation: { tech: 90, fin: 92, ref: 88 },
      isBlacklisted: 'No'
    },
    {
      companyName: 'Swastik Air Systems',
      status: 'Financial Check',
      city: 'Chennai',
      state: 'Tamil Nadu',
      category: 'HVAC & Mechanical',
      turnover: 76000000,
      safetyScore: 87,
      evaluation: null,
      isBlacklisted: 'No'
    }
  ];

  let counter = 1;
  const currentYear = new Date().getFullYear();

  for (const c of contractorsData) {
    const paddedIndex = String(counter).padStart(5, '0');
    const appId = `AKIPL-${currentYear}-${paddedIndex}`;
    counter++;

    // Generate submitted date (spread out over last 6 months)
    const daysAgo = Math.floor(Math.random() * 180) + 1;
    const submittedAtDate = new Date();
    submittedAtDate.setDate(submittedAtDate.getDate() - daysAgo);

    console.log(`Seeding ${c.companyName} (${appId})...`);

    // Create Contractor
    const contractor = await prisma.contractor.create({
      data: {
        applicationId: appId,
        companyName: c.companyName,
        regNo: `U${Math.floor(10000 + Math.random() * 90000)}${c.state.slice(0, 2).toUpperCase()}${currentYear - 8}PTC${Math.floor(100000 + Math.random() * 900000)}`,
        pan: `${['A','B','C','D','E','F'][Math.floor(Math.random()*6)]}PK${['P','C','A','F','G'][Math.floor(Math.random()*5)]}${Math.floor(1000 + Math.random() * 9000)}${['Z','Y','X','W','V'][Math.floor(Math.random()*5)]}`,
        gst: `37${['A','B','C','D','E','F'][Math.floor(Math.random()*6)]}PK${['P','C','A','F','G'][Math.floor(Math.random()*5)]}${Math.floor(1000 + Math.random() * 9000)}${['Z','Y','X','W','V'][Math.floor(Math.random()*5)]}1Z${Math.floor(1 + Math.random()*9)}`,
        address: `${Math.floor(10 + Math.random() * 900)}, Industrial Area Phase II`,
        city: c.city,
        state: c.state,
        pincode: String(Math.floor(500000 + Math.random() * 99999)),
        website: `www.${c.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        description: `${c.companyName} is a premier engineering contractor specializing in ${c.category.toLowerCase()} and related infrastructure operations. With over ${Math.floor(5 + Math.random()*15)} years of operational excellence, we serve marquee clients across South India.`,
        status: c.status,
        submittedAt: c.status === 'Draft' ? null : submittedAtDate,
        createdAt: submittedAtDate,
        updatedAt: new Date(submittedAtDate.getTime() + 1000 * 60 * 60 * 24 * 3) // 3 days later
      }
    });

    // If status is not draft, build full profile details
    if (c.status !== 'Draft') {
      const activePrj = Math.floor(Math.random() * 8) + 1;
      const maxPrj = activePrj + Math.floor(Math.random() * 5) + 1;
      const teamSize = Math.floor(c.turnover / 1000000) * 2 + Math.floor(Math.random() * 30);
      
      const equipmentItems = [
        { name: 'Excavator (Hitachi)', qty: Math.floor(1 + Math.random() * 4), condition: 'Good' },
        { name: 'Concrete Mixer Truck', qty: Math.floor(2 + Math.random() * 6), condition: 'Excellent' },
        { name: 'Diesel Generator 125KVA', qty: Math.floor(1 + Math.random() * 3), condition: 'Good' },
        { name: 'Total Station Survey Equipment', qty: 2, condition: 'Excellent' }
      ];

      // 1. Technical Details
      await prisma.technicalDetail.create({
        data: {
          contractorId: contractor.id,
          categories: JSON.stringify([c.category, 'Infrastructure Consulting']),
          maxCapacity: maxPrj,
          currentProjects: activePrj,
          teamStrength: teamSize,
          certifications: JSON.stringify(['ISO 9001:2015', 'ISO 45001:2018']),
          safetyScore: c.safetyScore,
          equipment: JSON.stringify(equipmentItems)
        }
      });

      // 2. Financial Details
      const creditRatings = ['AA+', 'AA', 'A+', 'A', 'BBB+', 'BBB', 'BB'];
      await prisma.financialDetail.create({
        data: {
          contractorId: contractor.id,
          turnoverY1: c.turnover,
          turnoverY2: c.turnover * 0.9,
          turnoverY3: c.turnover * 0.8,
          netWorth: c.turnover * 0.3,
          liabilities: c.turnover * 0.15,
          bankName: ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank'][Math.floor(Math.random()*4)],
          bankAccountType: 'Current',
          creditRating: creditRatings[Math.floor(Math.random() * creditRatings.length)],
          emdCapability: c.turnover * 0.05,
          blacklistStatus: c.isBlacklisted,
          blacklistReason: c.isBlacklisted === 'Yes' ? 'Repeated failure to comply with safety regulations and delayed executions.' : null
        }
      });

      // 3. Project References (dynamic, 2 per contractor)
      await prisma.projectReference.create({
        data: {
          contractorId: contractor.id,
          projectName: 'AKIPL Township Infrastructure Phase 1',
          clientName: 'Avinash Kanaparthi Infra Private Limited',
          contractValue: c.turnover * 0.25,
          startDate: `${currentYear - 2}-04-01`,
          endDate: `${currentYear - 1}-08-30`,
          type: c.category,
          status: 'Completed',
          clientContact: 'procurement@akipl.com',
          description: `Contract for comprehensive setup of ${c.category.toLowerCase()} across 40 acres site.`
        }
      });

      await prisma.projectReference.create({
        data: {
          contractorId: contractor.id,
          projectName: 'Metro Rail Allied Works Package B',
          clientName: 'L&T Construction',
          contractValue: c.turnover * 0.4,
          startDate: `${currentYear - 1}-01-15`,
          endDate: `${currentYear}-12-10`,
          type: c.category,
          status: 'In Progress',
          clientContact: 'subcontracts@lntecc.com',
          description: `Sub-contract for auxiliary system design and deployment of ${c.category.toLowerCase()} structures.`
        }
      });

      // 4. Documents Upload Simulation
      const docTypes = ['Registration', 'GST', 'PAN', 'BalanceSheet', 'WorkOrder', 'BankSolvency'];
      for (const dType of docTypes) {
        await prisma.document.create({
          data: {
            contractorId: contractor.id,
            docType: dType,
            fileName: `${dType.toLowerCase()}_certificate.pdf`,
            fileUrl: `/uploads/${contractor.id}/${dType.toLowerCase()}_mock.pdf`,
            verified: c.status === 'Approved'
          }
        });
      }

      // 5. Evaluation Data
      if (c.evaluation) {
        const overall = c.evaluation.tech * 0.40 + c.evaluation.fin * 0.35 + c.evaluation.ref * 0.25;
        const revId = Math.random() > 0.5 ? staff.id : staff2.id;
        
        await prisma.evaluation.create({
          data: {
            contractorId: contractor.id,
            reviewerId: revId,
            technicalScore: c.evaluation.tech,
            financialScore: c.evaluation.fin,
            referenceScore: c.evaluation.ref,
            overallScore: parseFloat(overall.toFixed(2)),
            notes: c.status === 'Approved' 
              ? 'Excellent track record of safety and solid solvency ratio. Highly recommended for empanelment in AKIPL lists.' 
              : 'Failed to qualify due to unacceptable safety standards and insufficient turnover requirements.',
            status: c.status,
            evaluatedAt: new Date(submittedAtDate.getTime() + 1000 * 60 * 60 * 24 * 5)
          }
        });

        // If approved, create audit log and notification
        if (c.status === 'Approved') {
          await prisma.auditLog.create({
            data: {
              userId: revId,
              action: 'APPROVE_APPLICATION',
              entityType: 'CONTRACTOR',
              entityId: contractor.id,
              oldValue: 'Under Review',
              newValue: 'Approved',
              ipAddress: '192.168.1.45'
            }
          });

          await prisma.notification.create({
            data: {
              userId: externalContractor.id,
              type: 'success',
              title: 'Empanelment Approved',
              message: `Congratulations! Your vendor empanelment application ${contractor.companyName} (${contractor.applicationId}) has been approved.`,
              entityId: contractor.id
            }
          });
        } else if (c.status === 'Rejected') {
          await prisma.auditLog.create({
            data: {
              userId: revId,
              action: 'REJECT_APPLICATION',
              entityType: 'CONTRACTOR',
              entityId: contractor.id,
              oldValue: 'Under Review',
              newValue: 'Rejected',
              ipAddress: '192.168.1.45'
            }
          });

          await prisma.notification.create({
            data: {
              userId: externalContractor.id,
              type: 'error',
              title: 'Empanelment Rejected',
              message: `Your application ${contractor.companyName} (${contractor.applicationId}) was rejected. Score did not meet minimum qualification threshold.`,
              entityId: contractor.id
            }
          });
        }
      } else {
        // Just created/submitted, create relevant notification
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'info',
            title: 'New Application Received',
            message: `A new application from ${contractor.companyName} (${contractor.applicationId}) has been submitted for review.`,
            entityId: contractor.id
          }
        });
      }
    }
  }

  // Create some global notifications
  await prisma.notification.create({
    data: {
      userId: admin.id,
      type: 'warning',
      title: 'Empanelment Expiring Soon',
      message: `Apex Civil Constructors Ltd (AKIPL-2026-00001) empanelment will expire in 45 days.`,
      entityId: 'expiring-mock'
    }
  });

  await prisma.notification.create({
    data: {
      userId: staff.id,
      type: 'warning',
      title: 'Application Idle Alert',
      message: `Delta Steel Fabricators has been in "Financial Check" status for over 8 days.`,
      entityId: 'idle-mock'
    }
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
