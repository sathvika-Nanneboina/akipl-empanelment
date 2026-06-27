import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-akipl-contractor-empanelment-system-2026';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(morgan('dev'));
// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Multer Config for Mock Document Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const contractorId = req.params.id || 'drafts';
    const dest = path.join(uploadDir, contractorId);
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// System configuration for scoring weights (Stored in memory for prototype)
let systemSettings = {
  companyName: 'AVINASH KANAPARTHI INFRA PRIVATE LIMITED',
  weightTechnical: 40, // 40%
  weightFinancial: 35, // 35%
  weightReferences: 25, // 25%
  minApprovalScore: 60,
  categories: [
    'Civil Works',
    'Electrical Systems',
    'Plumbing & Piping',
    'HVAC & Mechanical',
    'Structural Steel',
    'Roads & Paving',
    'Interior & Fit-out'
  ]
};

// ==========================================
// MIDDLEWARES
// ==========================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) return res.status(401).json({ message: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token is invalid or expired' });
    req.user = user;
    next();
  });
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Forbidden: Requires role ${roles.join(' or ')}` });
    }
    next();
  };
};

const logAudit = async (userId, action, entityType, entityId, oldValue = null, newValue = null, req = null) => {
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : '127.0.0.1';
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        oldValue: oldValue ? String(oldValue) : null,
        newValue: newValue ? String(newValue) : null,
        ipAddress
      }
    });
  } catch (error) {
    console.error('Audit Logging Failed:', error);
  }
};

// ==========================================
// SCORING ENGINE LOGIC (Helper function)
// ==========================================

const calculateSuggestedScores = (contractor) => {
  if (!contractor || !contractor.technicalDetails || !contractor.financialDetails) {
    return { technical: 0, financial: 0, references: 0, overall: 0 };
  }

  const tech = contractor.technicalDetails;
  const fin = contractor.financialDetails;
  const refs = contractor.projectReferences || [];

  // 1. Technical Score suggestions
  // Capacity Utilization: (Current / Max) * 100. Ideal target is 60%.
  const capRatio = tech.maxCapacity > 0 ? (tech.currentProjects / tech.maxCapacity) : 0;
  let capacityScore = 100;
  if (capRatio > 0.8) {
    capacityScore = Math.max(0, 100 - (capRatio - 0.8) * 150); // Penalize overload
  } else if (capRatio < 0.2) {
    capacityScore = 60; // Penalize complete idleness
  } else {
    capacityScore = 100; // Perfect sweet-spot
  }

  // Equipment Score based on quantity/condition
  let equipmentScore = 70;
  try {
    const eqList = JSON.parse(tech.equipment || '[]');
    if (eqList.length > 0) {
      const sum = eqList.reduce((acc, eq) => {
        const scoreMap = { 'Excellent': 100, 'Good': 85, 'Fair': 60, 'Poor': 30 };
        return acc + (scoreMap[eq.condition] || 70);
      }, 0);
      equipmentScore = sum / eqList.length;
    }
  } catch (e) {
    equipmentScore = 70;
  }

  // Active Projects Ratio/Count
  const activePrjScore = Math.min(100, tech.currentProjects * 15 + 40);

  // ISO Certification Bonus
  let certBonus = 0;
  try {
    const certList = JSON.parse(tech.certifications || '[]');
    certBonus = Math.min(20, certList.length * 10);
  } catch (e) {
    certBonus = 0;
  }

  const systemTechScore = Math.min(100, (capacityScore * 0.35 + equipmentScore * 0.35 + activePrjScore * 0.30) + certBonus);

  // 2. Financial Score suggestions
  // Average Annual Turnover
  const avgTurnover = (fin.turnoverY1 + fin.turnoverY2 + fin.turnoverY3) / 3;
  // Normalize turnover based on 10 Crores benchmark
  const turnoverScore = Math.min(100, (avgTurnover / 100000000) * 100);

  // Net Worth vs Liabilities
  const netWorthRatio = fin.netWorth > 0 ? (fin.liabilities / fin.netWorth) : 1;
  const netWorthScore = Math.max(0, 100 - netWorthRatio * 100); // lower liabilities to net worth is better

  // Credit Rating Map
  const creditMap = { 'AAA': 100, 'AA+': 95, 'AA': 90, 'A+': 85, 'A': 80, 'BBB+': 70, 'BBB': 60, 'BB': 40 };
  const ratingScore = creditMap[fin.creditRating] || 50;

  // EMD Capability (Benchmark: 50 Lakhs)
  const emdScore = Math.min(100, (fin.emdCapability / 5000000) * 100);

  const systemFinScore = turnoverScore * 0.4 + netWorthScore * 0.2 + ratingScore * 0.2 + emdScore * 0.2;

  // 3. Reference Score suggestions
  let systemRefScore = 50;
  if (refs.length > 0) {
    const totalVal = refs.reduce((acc, ref) => acc + ref.contractValue, 0);
    const avgVal = totalVal / refs.length;
    // Normalize average contract value (Benchmark: 2 Crores)
    const refValScore = Math.min(100, (avgVal / 20000000) * 100);
    
    // Completion rate
    const completedCount = refs.filter(r => r.status === 'Completed').length;
    const completionRateScore = (completedCount / refs.length) * 100;

    systemRefScore = refValScore * 0.5 + completionRateScore * 0.5;
  }

  // Calculate System Suggested Overall Score
  const wTech = systemSettings.weightTechnical / 100;
  const wFin = systemSettings.weightFinancial / 100;
  const wRef = systemSettings.weightReferences / 100;
  
  const systemOverallScore = systemTechScore * wTech + systemFinScore * wFin + systemRefScore * wRef;

  return {
    technical: Math.round(systemTechScore),
    financial: Math.round(systemFinScore),
    references: Math.round(systemRefScore),
    overall: parseFloat(systemOverallScore.toFixed(2))
  };
};

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials or account is suspended' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Token expires in 12 hours
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    // If contractor, find if there is an application associated
    let contractorProfile = null;
    if (user.role === 'CONTRACTOR') {
      // Find a contractor record matching the email or company
      contractorProfile = await prisma.contractor.findFirst({
        where: {
          OR: [
            { companyName: user.name },
            { website: { contains: user.email.split('@')[0] } }
          ]
        }
      });
    }

    await logAudit(user.id, 'LOGIN', 'USER', user.id, null, 'SUCCESS', req);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl
      },
      contractorProfileId: contractorProfile ? contractorProfile.id : null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  await logAudit(req.user.id, 'LOGOUT', 'USER', req.user.id, null, null, req);
  res.json({ message: 'Logged out successfully' });
});

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(uploadDir, 'avatars');
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadAvatar = multer({ storage: avatarStorage });

app.post('/api/auth/profile/avatar', authenticateToken, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    res.json({ avatarUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  const { name, email, avatarUrl, password } = req.body;
  const userId = req.user.id;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (email && email !== user.email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already in use' });
      }
    }

    const dataToUpdate = {};
    if (name) dataToUpdate.name = name;
    if (email) dataToUpdate.email = email;
    if (avatarUrl !== undefined) dataToUpdate.avatarUrl = avatarUrl;
    if (password) {
      dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate
    });

    const token = jwt.sign(
      { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role, name: updatedUser.name },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    await logAudit(userId, 'UPDATE_PROFILE', 'USER', userId, JSON.stringify({ name: user.name, email: user.email }), JSON.stringify({ name: updatedUser.name, email: updatedUser.email }), req);

    res.json({
      token,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        avatarUrl: updatedUser.avatarUrl
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  // Mock token refresh
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: 'Token required' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    const newToken = jwt.sign(
      { id: decoded.id, email: decoded.email, role: decoded.role, name: decoded.name },
      JWT_SECRET,
      { expiresIn: '12h' }
    );
    res.json({ token: newToken });
  } catch (e) {
    res.status(403).json({ message: 'Invalid token signature' });
  }
});

// ==========================================
// APPLICATION ENDPOINTS
// ==========================================

// GET /api/applications - List with Pagination, Filters, Search
app.get('/api/applications', authenticateToken, authorizeRoles('STAFF', 'ADMIN', 'CONTRACTOR'), async (req, res) => {
  try {
    const { status, category, search, page = 1, limit = 20, minScore, maxScore } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    let whereClause = {};

    if (req.user.role === 'CONTRACTOR') {
      whereClause.companyName = req.user.name;
    } else {
      if (status) {
        whereClause.status = status;
      }

      if (category) {
        whereClause.technicalDetails = {
          categories: {
            contains: category
          }
        };
      }

      if (search) {
        whereClause.OR = [
          { companyName: { contains: search } },
          { applicationId: { contains: search } },
          { city: { contains: search } },
          { state: { contains: search } }
        ];
      }

      if (minScore || maxScore) {
        whereClause.evaluations = {
          some: {
            overallScore: {
              gte: minScore ? parseFloat(minScore) : 0,
              lte: maxScore ? parseFloat(maxScore) : 100
            }
          }
        };
      }
    }

    const [applications, totalCount] = await Promise.all([
      prisma.contractor.findMany({
        where: whereClause,
        include: {
          technicalDetails: true,
          financialDetails: true,
          evaluations: {
            orderBy: { evaluatedAt: 'desc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNumber
      }),
      prisma.contractor.count({ where: whereClause })
    ]);

    // Enhance response with calculated suggested score and overall rating if evaluated
    const enhancedApplications = applications.map(app => {
      const suggest = calculateSuggestedScores(app);
      const latestEval = app.evaluations[0] || null;
      return {
        id: app.id,
        applicationId: app.applicationId,
        companyName: app.companyName,
        city: app.city,
        state: app.state,
        status: app.status,
        submittedAt: app.submittedAt,
        category: app.technicalDetails ? JSON.parse(app.technicalDetails.categories || '[]')[0] : 'N/A',
        suggestedScore: suggest.overall,
        finalScore: latestEval ? latestEval.overallScore : null,
        financialScore: latestEval ? latestEval.financialScore : suggest.financial,
        technicalScore: latestEval ? latestEval.technicalScore : suggest.technical,
        referenceScore: latestEval ? latestEval.referenceScore : suggest.references
      };
    });

    res.json({
      data: enhancedApplications,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNumber)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/applications/:id - Full details
app.get('/api/applications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const application = await prisma.contractor.findUnique({
      where: { id },
      include: {
        technicalDetails: true,
        financialDetails: true,
        projectReferences: true,
        documents: true,
        evaluations: {
          include: {
            reviewer: {
              select: { name: true, role: true }
            }
          },
          orderBy: { evaluatedAt: 'desc' }
        }
      }
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Security: Contractors can only view their own profile
    if (req.user.role === 'CONTRACTOR' && req.user.name !== application.companyName) {
      // Find if email matches the contractor's website/domain as fallback
      const domainName = req.user.email.split('@')[0];
      if (!application.website?.includes(domainName)) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const suggested = calculateSuggestedScores(application);

    res.json({
      ...application,
      suggestedScores: suggested
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/applications - Save draft / Create
app.post('/api/applications', authenticateToken, async (req, res) => {
  try {
    const data = req.body;
    
    // Generate new unique sequential ID
    const currentYear = new Date().getFullYear();
    const lastContractor = await prisma.contractor.findFirst({
      orderBy: { createdAt: 'desc' }
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

    const newContractor = await prisma.contractor.create({
      data: {
        applicationId: newAppId,
        companyName: data.companyName || (req.user.role === 'CONTRACTOR' ? req.user.name : 'Draft Company'),
        regNo: data.regNo || '',
        pan: data.pan || '',
        gst: data.gst || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
        website: data.website || '',
        description: data.description || '',
        status: 'Draft'
      }
    });

    await logAudit(req.user.id, 'CREATE_DRAFT', 'CONTRACTOR', newContractor.id, null, newAppId, req);

    res.status(201).json(newContractor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/applications/:id - Update full application wizard details / Auto-save draft
app.put('/api/applications/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const existing = await prisma.contractor.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Strictly enforce workflow block: If submitted/approved, it cannot be modified unless 'Resubmit Required'
    if (existing.status !== 'Draft' && existing.status !== 'Resubmit Required' && req.user.role === 'CONTRACTOR') {
      return res.status(400).json({ message: 'Submitted applications cannot be modified.' });
    }

    // Security: Contractors can only modify their own profile
    if (req.user.role === 'CONTRACTOR' && req.user.name !== existing.companyName) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Handle updates to core details
    const updatedContractor = await prisma.contractor.update({
      where: { id },
      data: {
        companyName: data.companyName,
        regNo: data.regNo,
        pan: data.pan,
        gst: data.gst,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        website: data.website,
        description: data.description,
        status: data.submit === true ? 'Submitted' : existing.status,
        submittedAt: data.submit === true ? new Date() : existing.submittedAt
      }
    });

    // Handle Technical details
    if (data.technicalDetails) {
      const tech = data.technicalDetails;
      await prisma.technicalDetail.upsert({
        where: { contractorId: id },
        create: {
          contractorId: id,
          categories: JSON.stringify(tech.categories || []),
          maxCapacity: parseInt(tech.maxCapacity || 0),
          currentProjects: parseInt(tech.currentProjects || 0),
          teamStrength: parseInt(tech.teamStrength || 0),
          certifications: JSON.stringify(tech.certifications || []),
          safetyScore: parseInt(tech.safetyScore || 0),
          equipment: JSON.stringify(tech.equipment || [])
        },
        update: {
          categories: JSON.stringify(tech.categories || []),
          maxCapacity: parseInt(tech.maxCapacity || 0),
          currentProjects: parseInt(tech.currentProjects || 0),
          teamStrength: parseInt(tech.teamStrength || 0),
          certifications: JSON.stringify(tech.certifications || []),
          safetyScore: parseInt(tech.safetyScore || 0),
          equipment: JSON.stringify(tech.equipment || [])
        }
      });
    }

    // Handle Financial details
    if (data.financialDetails) {
      const fin = data.financialDetails;
      await prisma.financialDetail.upsert({
        where: { contractorId: id },
        create: {
          contractorId: id,
          turnoverY1: parseFloat(fin.turnoverY1 || 0),
          turnoverY2: parseFloat(fin.turnoverY2 || 0),
          turnoverY3: parseFloat(fin.turnoverY3 || 0),
          netWorth: parseFloat(fin.netWorth || 0),
          liabilities: parseFloat(fin.liabilities || 0),
          bankName: fin.bankName || '',
          bankAccountType: fin.bankAccountType || '',
          creditRating: fin.creditRating || '',
          emdCapability: parseFloat(fin.emdCapability || 0),
          blacklistStatus: fin.blacklistStatus || 'No',
          blacklistReason: fin.blacklistReason || ''
        },
        update: {
          turnoverY1: parseFloat(fin.turnoverY1 || 0),
          turnoverY2: parseFloat(fin.turnoverY2 || 0),
          turnoverY3: parseFloat(fin.turnoverY3 || 0),
          netWorth: parseFloat(fin.netWorth || 0),
          liabilities: parseFloat(fin.liabilities || 0),
          bankName: fin.bankName || '',
          bankAccountType: fin.bankAccountType || '',
          creditRating: fin.creditRating || '',
          emdCapability: parseFloat(fin.emdCapability || 0),
          blacklistStatus: fin.blacklistStatus || 'No',
          blacklistReason: fin.blacklistReason || ''
        }
      });
    }

    // Handle Project References (replace existing ones with new ones)
    if (data.projectReferences) {
      await prisma.projectReference.deleteMany({ where: { contractorId: id } });
      if (data.projectReferences.length > 0) {
        await prisma.projectReference.createMany({
          data: data.projectReferences.map(ref => ({
            contractorId: id,
            projectName: ref.projectName || 'Unnamed Project',
            clientName: ref.clientName || 'Unknown Client',
            contractValue: parseFloat(ref.contractValue || 0),
            startDate: ref.startDate || '',
            endDate: ref.endDate || '',
            type: ref.type || '',
            status: ref.status || 'Completed',
            clientContact: ref.clientContact || '',
            description: ref.description || ''
          }))
        });
      }
    }

    // Notifications & Logs
    if (data.submit === true) {
      await logAudit(req.user.id, 'SUBMIT_APPLICATION', 'CONTRACTOR', id, existing.status, 'Submitted', req);
      
      // Notify staff and admins
      const staffMembers = await prisma.user.findMany({ where: { role: { in: ['STAFF', 'ADMIN'] } } });
      for (const m of staffMembers) {
        await prisma.notification.create({
          data: {
            userId: m.id,
            type: 'info',
            title: 'Application Submitted',
            message: `${updatedContractor.companyName} submitted their pre-qualification forms (${updatedContractor.applicationId})`,
            entityId: id
          }
        });
      }
    } else {
      await logAudit(req.user.id, 'UPDATE_DRAFT', 'CONTRACTOR', id, null, 'Draft Saved', req);
    }

    res.json(updatedContractor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PATCH /api/applications/:id/status - Change status manually
app.patch('/api/applications/:id/status', authenticateToken, authorizeRoles('STAFF', 'ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { status, comments } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }

  // Validate status flow
  const allowedStatuses = [
    'Draft', 'Submitted', 'Under Review', 'Technical Evaluation',
    'Financial Check', 'Approved', 'Rejected', 'Resubmit Required'
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status state' });
  }

  try {
    const existing = await prisma.contractor.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const updated = await prisma.contractor.update({
      where: { id },
      data: { status }
    });

    await logAudit(req.user.id, 'CHANGE_STATUS', 'CONTRACTOR', id, existing.status, status, req);

    // Notify user if email exists or matches
    const associatedUsers = await prisma.user.findMany({
      where: {
        OR: [
          { name: existing.companyName },
          { email: { contains: existing.website?.split('www.')[1]?.split('.')[0] || '___nonexistent___' } }
        ]
      }
    });

    for (const u of associatedUsers) {
      let notifType = 'info';
      if (status === 'Approved') notifType = 'success';
      if (status === 'Rejected') notifType = 'error';
      if (status === 'Resubmit Required') notifType = 'warning';

      await prisma.notification.create({
        data: {
          userId: u.id,
          type: notifType,
          title: `Application Status Update`,
          message: `Your application status has been changed to: ${status}. Evaluator notes: ${comments || 'No comment provided.'}`,
          entityId: id
        }
      });
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/applications/:id - Admin only
app.delete('/api/applications/:id', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.contractor.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Application not found' });
    }

    await prisma.contractor.delete({ where: { id } });
    await logAudit(req.user.id, 'DELETE_APPLICATION', 'CONTRACTOR', id, existing.applicationId, null, req);

    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==========================================
// MOCK DOCUMENT UPLOADS
// ==========================================

app.post('/api/applications/:id/documents', authenticateToken, upload.single('file'), async (req, res) => {
  const { id } = req.params;
  const { docType } = req.body;

  if (!req.file || !docType) {
    return res.status(400).json({ message: 'File and docType are required' });
  }

  try {
    const contractor = await prisma.contractor.findUnique({ where: { id } });
    if (!contractor) {
      return res.status(404).json({ message: 'Contractor not found' });
    }

    if (req.user.role === 'CONTRACTOR' && req.user.name !== contractor.companyName) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const doc = await prisma.document.create({
      data: {
        contractorId: id,
        docType,
        fileName: req.file.originalname,
        fileUrl: `/uploads/${id}/${req.file.filename}`
      }
    });

    await logAudit(req.user.id, 'UPLOAD_DOCUMENT', 'DOCUMENT', doc.id, null, doc.fileName, req);

    res.status(201).json(doc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==========================================
// EVALUATION ENDPOINTS
// ==========================================

// POST /api/applications/:id/evaluate - Submit Evaluation
app.post('/api/applications/:id/evaluate', authenticateToken, authorizeRoles('STAFF', 'ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { technicalScore, financialScore, referenceScore, notes, decision } = req.body;

  if (technicalScore === undefined || financialScore === undefined || referenceScore === undefined || !decision) {
    return res.status(400).json({ message: 'Technical score, Financial score, Reference score, and Decision are required.' });
  }

  try {
    const contractor = await prisma.contractor.findUnique({
      where: { id }
    });

    if (!contractor) {
      return res.status(404).json({ message: 'Contractor not found' });
    }

    // Weighted Score logic: Technical (40%), Financial (35%), References (25%)
    const weightedOverall = (technicalScore * 0.40) + (financialScore * 0.35) + (referenceScore * 0.25);
    const roundedOverall = parseFloat(weightedOverall.toFixed(2));

    // Enforcement: Minimum overall score to qualify for Approval is 60
    let finalDecision = decision;
    if (decision === 'Approved' && roundedOverall < systemSettings.minApprovalScore) {
      return res.status(400).json({ 
        message: `Cannot approve. Weighted overall score (${roundedOverall}) is below the required empanelment threshold of ${systemSettings.minApprovalScore}/100.` 
      });
    }

    const evaluation = await prisma.evaluation.create({
      data: {
        contractorId: id,
        reviewerId: req.user.id,
        technicalScore: parseFloat(technicalScore),
        financialScore: parseFloat(financialScore),
        referenceScore: parseFloat(referenceScore),
        overallScore: roundedOverall,
        notes,
        status: finalDecision
      }
    });

    // Update contractor status
    const prevStatus = contractor.status;
    await prisma.contractor.update({
      where: { id },
      data: {
        status: finalDecision
      }
    });

    await logAudit(req.user.id, 'SUBMIT_EVALUATION', 'EVALUATION', evaluation.id, prevStatus, finalDecision, req);

    // Notification triggers
    const contractorUsers = await prisma.user.findMany({
      where: {
        OR: [
          { name: contractor.companyName },
          { email: { contains: contractor.website?.split('www.')[1]?.split('.')[0] || '___nonexistent___' } }
        ]
      }
    });

    for (const u of contractorUsers) {
      await prisma.notification.create({
        data: {
          userId: u.id,
          type: finalDecision === 'Approved' ? 'success' : (finalDecision === 'Rejected' ? 'error' : 'warning'),
          title: `Empanelment Evaluation Decision: ${finalDecision}`,
          message: `Evaluation completed by team. Overall Score: ${roundedOverall}/100. Notes: ${notes}`,
          entityId: id
        }
      });
    }

    res.json(evaluation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/applications/:id/evaluation - Fetch latest evaluations
app.get('/api/applications/:id/evaluation', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const evals = await prisma.evaluation.findMany({
      where: { contractorId: id },
      include: {
        reviewer: {
          select: { name: true, role: true }
        }
      },
      orderBy: { evaluatedAt: 'desc' }
    });
    res.json(evals);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/applications/:id/audit-trail - Fetch audit trail for application
app.get('/api/applications/:id/audit-trail', authenticateToken, authorizeRoles('STAFF', 'ADMIN'), async (req, res) => {
  const { id } = req.params;
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        entityId: id,
        entityType: 'CONTRACTOR'
      },
      include: {
        user: { select: { name: true, role: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==========================================
// VENDOR REGISTRY ENDPOINTS
// ==========================================

// GET /api/vendors - Empanelled (Approved) Vendors
app.get('/api/vendors', authenticateToken, async (req, res) => {
  try {
    const { category, city, rating, search } = req.query;

    let whereClause = {
      status: 'Approved'
    };

    if (category) {
      whereClause.technicalDetails = {
        categories: { contains: category }
      };
    }

    if (city) {
      whereClause.city = city;
    }

    const vendors = await prisma.contractor.findMany({
      where: whereClause,
      include: {
        technicalDetails: true,
        financialDetails: true,
        evaluations: {
          orderBy: { evaluatedAt: 'desc' },
          take: 1
        }
      },
      orderBy: { companyName: 'asc' }
    });

    let mappedVendors = vendors.map(v => {
      const latestEval = v.evaluations[0];
      const categoriesArr = v.technicalDetails ? JSON.parse(v.technicalDetails.categories || '[]') : [];
      
      // Map score to rating stars (0-5 stars)
      const score = latestEval ? latestEval.overallScore : 60;
      let stars = 3;
      if (score >= 90) stars = 5;
      else if (score >= 75) stars = 4;
      
      // Calculate empanelment dates (2 years validity)
      const empDate = latestEval ? latestEval.evaluatedAt : v.updatedAt;
      const expDate = new Date(empDate.getTime());
      expDate.setFullYear(expDate.getFullYear() + 2);

      return {
        id: v.id,
        applicationId: v.applicationId,
        companyName: v.companyName,
        categories: categoriesArr,
        city: v.city,
        state: v.state,
        ratingStars: stars,
        score: score,
        empanelmentDate: empDate,
        expiryDate: expDate,
        email: v.website ? `info@${v.website.replace('www.', '')}` : 'contact@akipl-vendor.com',
        phone: '+91 98765 43210'
      };
    });

    // Client-side search filters for simple parsing
    if (search) {
      const s = search.toLowerCase();
      mappedVendors = mappedVendors.filter(v => 
        v.companyName.toLowerCase().includes(s) ||
        v.applicationId.toLowerCase().includes(s) ||
        v.city.toLowerCase().includes(s) ||
        v.categories.some(c => c.toLowerCase().includes(s))
      );
    }

    if (rating) {
      const r = parseInt(rating);
      mappedVendors = mappedVendors.filter(v => v.ratingStars === r);
    }

    res.json(mappedVendors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/vendors/:id - Vendor Profile & History
app.get('/api/vendors/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await prisma.contractor.findUnique({
      where: { id },
      include: {
        technicalDetails: true,
        financialDetails: true,
        projectReferences: true,
        evaluations: {
          orderBy: { evaluatedAt: 'desc' },
          take: 1
        }
      }
    });

    if (!vendor || vendor.status !== 'Approved') {
      return res.status(404).json({ message: 'Empanelled Vendor not found' });
    }

    const latestEval = vendor.evaluations[0];
    const empDate = latestEval ? latestEval.evaluatedAt : vendor.updatedAt;
    const expDate = new Date(empDate.getTime());
    expDate.setFullYear(expDate.getFullYear() + 2);

    const score = latestEval ? latestEval.overallScore : 60;
    let stars = 3;
    if (score >= 90) stars = 5;
    else if (score >= 75) stars = 4;

    res.json({
      ...vendor,
      empanelmentDate: empDate,
      expiryDate: expDate,
      ratingStars: stars,
      overallScore: score
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==========================================
// ANALYTICS & REPORTS ENDPOINTS
// ==========================================

app.get('/api/analytics/summary', authenticateToken, authorizeRoles('STAFF', 'ADMIN'), async (req, res) => {
  try {
    const totalCount = await prisma.contractor.count();
    const approvedCount = await prisma.contractor.count({ where: { status: 'Approved' } });
    const pendingCount = await prisma.contractor.count({ 
      where: { status: { in: ['Submitted', 'Under Review', 'Technical Evaluation', 'Financial Check'] } } 
    });
    const rejectedCount = await prisma.contractor.count({ where: { status: 'Rejected' } });
    const draftCount = await prisma.contractor.count({ where: { status: 'Draft' } });

    // Average processing time (Submitted to Approved/Rejected evaluation)
    const evals = await prisma.evaluation.findMany({
      include: { contractor: true }
    });

    let totalDays = 0;
    let countedEvals = 0;

    evals.forEach(e => {
      if (e.contractor && e.contractor.submittedAt) {
        const diffTime = Math.abs(new Date(e.evaluatedAt) - new Date(e.contractor.submittedAt));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        totalDays += diffDays;
        countedEvals++;
      }
    });

    const avgProcessingDays = countedEvals > 0 ? Math.round(totalDays / countedEvals) : 5;

    res.json({
      totalApplications: totalCount,
      approvedVendors: approvedCount,
      pendingReview: pendingCount,
      rejected: rejectedCount,
      underEvaluation: pendingCount, // Maps to pending status list
      avgProcessingDays
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/analytics/trends', authenticateToken, authorizeRoles('STAFF', 'ADMIN'), async (req, res) => {
  try {
    // Return last 12 months applications trend
    const contractors = await prisma.contractor.findMany({
      where: { submittedAt: { not: null } }
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendMap = {};

    // Pre-populate last 12 months
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      trendMap[key] = { name: key, submissions: 0, approvals: 0 };
    }

    contractors.forEach(c => {
      if (!c.submittedAt) return;
      const d = new Date(c.submittedAt);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      if (trendMap[key]) {
        trendMap[key].submissions++;
        if (c.status === 'Approved') {
          trendMap[key].approvals++;
        }
      }
    });

    res.json(Object.values(trendMap));
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/analytics/funnel', authenticateToken, authorizeRoles('STAFF', 'ADMIN'), async (req, res) => {
  try {
    const total = await prisma.contractor.count();
    const submitted = await prisma.contractor.count({ where: { status: { not: 'Draft' } } });
    const underReview = await prisma.contractor.count({ 
      where: { status: { in: ['Under Review', 'Technical Evaluation', 'Financial Check', 'Approved', 'Rejected'] } } 
    });
    const technicalPassed = await prisma.contractor.count({ 
      where: { status: { in: ['Financial Check', 'Approved'] } } 
    });
    const approved = await prisma.contractor.count({ where: { status: 'Approved' } });

    res.json([
      { stage: 'Drafts Created', count: total },
      { stage: 'Submitted Applications', count: submitted },
      { stage: 'Under Review / Evaluation', count: underReview },
      { stage: 'Passed Technical Round', count: technicalPassed },
      { stage: 'Approved / Empanelled', count: approved }
    ]);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/analytics/scores', authenticateToken, authorizeRoles('STAFF', 'ADMIN'), async (req, res) => {
  try {
    const techDetails = await prisma.technicalDetail.findMany({});
    
    // Group contractor categories count
    const categoryCount = {};
    techDetails.forEach(td => {
      try {
        const cats = JSON.parse(td.categories || '[]');
        cats.forEach(c => {
          categoryCount[c] = (categoryCount[c] || 0) + 1;
        });
      } catch (e) {}
    });

    const categorySummary = Object.entries(categoryCount).map(([name, count]) => ({
      name,
      count
    })).sort((a,b) => b.count - a.count);

    // Score distribution histogram
    const evals = await prisma.evaluation.findMany({
      select: { overallScore: true }
    });

    const brackets = {
      '0-40': 0,
      '41-60': 0,
      '61-70': 0,
      '71-80': 0,
      '81-90': 0,
      '91-100': 0
    };

    evals.forEach(e => {
      const score = e.overallScore;
      if (score <= 40) brackets['0-40']++;
      else if (score <= 60) brackets['41-60']++;
      else if (score <= 70) brackets['61-70']++;
      else if (score <= 80) brackets['71-80']++;
      else if (score <= 90) brackets['81-90']++;
      else brackets['91-100']++;
    });

    const scoreDistribution = Object.entries(brackets).map(([range, count]) => ({
      range,
      count
    }));

    res.json({
      categorySummary,
      scoreDistribution
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==========================================
// NOTIFICATION CENTER ENDPOINTS
// ==========================================

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await prisma.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { isRead: true }
    });
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.notification.deleteMany({
      where: { id, userId: req.user.id }
    });
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==========================================
// ADMIN CONFIG & USERS ENDPOINTS
// ==========================================

// CRUD Admin Users
app.get('/api/admin/users', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, avatarUrl: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/admin/users', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Name, email, password, and role are required.' });
  }
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: { name, email, passwordHash, role, isActive: true }
    });

    await logAudit(req.user.id, 'CREATE_USER', 'USER', user.id, null, `${name} (${role})`, req);
    res.status(201).json({ id: user.id, name, email, role, isActive: true });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch('/api/admin/users/:id/toggle-active', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'User not found' });
    if (existing.id === req.user.id) return res.status(400).json({ message: 'Cannot deactivate yourself.' });

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !existing.isActive }
    });

    await logAudit(req.user.id, 'TOGGLE_USER_STATUS', 'USER', id, existing.isActive, updated.isActive, req);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Scoring configuration weights
app.get('/api/admin/config/weights', authenticateToken, authorizeRoles('ADMIN', 'STAFF'), async (req, res) => {
  res.json(systemSettings);
});

app.post('/api/admin/config/weights', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  const { weightTechnical, weightFinancial, weightReferences, minApprovalScore } = req.body;
  
  if (weightTechnical + weightFinancial + weightReferences !== 100) {
    return res.status(400).json({ message: 'Weights must sum to exactly 100%.' });
  }

  systemSettings.weightTechnical = weightTechnical;
  systemSettings.weightFinancial = weightFinancial;
  systemSettings.weightReferences = weightReferences;
  if (minApprovalScore !== undefined) {
    systemSettings.minApprovalScore = minApprovalScore;
  }

  await logAudit(req.user.id, 'UPDATE_SCORING_WEIGHTS', 'SYSTEM', 'CONFIG', null, JSON.stringify(systemSettings), req);
  res.json(systemSettings);
});

// Category Master
app.post('/api/admin/config/categories', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  const { category, action } = req.body;
  if (!category) return res.status(400).json({ message: 'Category name is required' });
  
  if (action === 'add') {
    if (!systemSettings.categories.includes(category)) {
      systemSettings.categories.push(category);
    }
  } else if (action === 'remove') {
    systemSettings.categories = systemSettings.categories.filter(c => c !== category);
  }

  await logAudit(req.user.id, 'UPDATE_CATEGORIES', 'SYSTEM', 'CONFIG', null, category, req);
  res.json(systemSettings.categories);
});

// Blacklist Management
app.post('/api/admin/blacklist', authenticateToken, authorizeRoles('ADMIN', 'STAFF'), async (req, res) => {
  const { contractorId, action, reason } = req.body; // action: 'blacklist' or 'whitelist'
  if (!contractorId || !action) return res.status(400).json({ message: 'Contractor ID and action are required.' });

  try {
    const contractor = await prisma.contractor.findUnique({ where: { id: contractorId } });
    if (!contractor) return res.status(404).json({ message: 'Contractor not found' });

    if (action === 'blacklist') {
      await prisma.financialDetail.upsert({
        where: { contractorId },
        create: {
          contractorId,
          turnoverY1: 0, turnoverY2: 0, turnoverY3: 0, netWorth: 0, liabilities: 0, bankName: '', bankAccountType: '', creditRating: '', emdCapability: 0,
          blacklistStatus: 'Yes',
          blacklistReason: reason || 'Blacklisted by administrator.'
        },
        update: {
          blacklistStatus: 'Yes',
          blacklistReason: reason || 'Blacklisted by administrator.'
        }
      });

      await prisma.contractor.update({
        where: { id: contractorId },
        data: { status: 'Rejected' }
      });

      await logAudit(req.user.id, 'BLACKLIST_CONTRACTOR', 'CONTRACTOR', contractorId, 'No', 'Yes', req);
    } else {
      await prisma.financialDetail.update({
        where: { contractorId },
        data: {
          blacklistStatus: 'No',
          blacklistReason: null
        }
      });
      await logAudit(req.user.id, 'WHITELIST_CONTRACTOR', 'CONTRACTOR', contractorId, 'Yes', 'No', req);
    }

    res.json({ message: `Contractor successfully ${action}ed.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Audit Logs Retrieval
app.get('/api/admin/audit-logs', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { name: true, role: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Export Data (Mock return of CSV rows)
app.get('/api/admin/export', authenticateToken, authorizeRoles('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const vendors = await prisma.contractor.findMany({
      include: {
        technicalDetails: true,
        financialDetails: true
      }
    });

    let csvContent = 'ApplicationID,CompanyName,GST,City,State,Status,MaxCapacity,SafetyScore,TurnoverY1,CreditRating\n';
    vendors.forEach(v => {
      const tech = v.technicalDetails;
      const fin = v.financialDetails;
      csvContent += `"${v.applicationId}","${v.companyName}","${v.gst}","${v.city}","${v.state}","${v.status}",${tech ? tech.maxCapacity : 0},${tech ? tech.safetyScore : 0},${fin ? fin.turnoverY1 : 0},"${fin ? fin.creditRating : 'N/A'}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="akipl_contractors_export.csv"');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Failed to export' });
  }
});

// ==========================================
// RE-EMPANELMENT API
// ==========================================
app.post('/api/applications/:id/re-empanel', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.contractor.findUnique({
      where: { id },
      include: {
        technicalDetails: true,
        financialDetails: true,
        projectReferences: true
      }
    });

    if (!existing || existing.status !== 'Approved') {
      return res.status(400).json({ message: 'Only approved empanelled contractors can apply for renewal/re-empanelment.' });
    }

    // Generate new sequential ID
    const currentYear = new Date().getFullYear();
    const lastContractor = await prisma.contractor.findFirst({
      orderBy: { createdAt: 'desc' }
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

    // Create a new clone application in draft status prefilled with previous data
    const clone = await prisma.contractor.create({
      data: {
        applicationId: newAppId,
        companyName: existing.companyName,
        regNo: existing.regNo,
        pan: existing.pan,
        gst: existing.gst,
        address: existing.address,
        city: existing.city,
        state: existing.state,
        pincode: existing.pincode,
        website: existing.website,
        description: existing.description,
        status: 'Draft'
      }
    });

    // Clone details
    if (existing.technicalDetails) {
      const tech = existing.technicalDetails;
      await prisma.technicalDetail.create({
        data: {
          contractorId: clone.id,
          categories: tech.categories,
          maxCapacity: tech.maxCapacity,
          currentProjects: tech.currentProjects,
          teamStrength: tech.teamStrength,
          certifications: tech.certifications,
          safetyScore: tech.safetyScore,
          equipment: tech.equipment
        }
      });
    }

    if (existing.financialDetails) {
      const fin = existing.financialDetails;
      await prisma.financialDetail.create({
        data: {
          contractorId: clone.id,
          turnoverY1: fin.turnoverY1,
          turnoverY2: fin.turnoverY2,
          turnoverY3: fin.turnoverY3,
          netWorth: fin.netWorth,
          liabilities: fin.liabilities,
          bankName: fin.bankName,
          bankAccountType: fin.bankAccountType,
          creditRating: fin.creditRating,
          emdCapability: fin.emdCapability,
          blacklistStatus: fin.blacklistStatus,
          blacklistReason: fin.blacklistReason
        }
      });
    }

    if (existing.projectReferences.length > 0) {
      await prisma.projectReference.createMany({
        data: existing.projectReferences.map(r => ({
          contractorId: clone.id,
          projectName: r.projectName,
          clientName: r.clientName,
          contractValue: r.contractValue,
          startDate: r.startDate,
          endDate: r.endDate,
          type: r.type,
          status: r.status,
          clientContact: r.clientContact,
          description: r.description
        }))
      });
    }

    await logAudit(req.user.id, 'RE_EMPANELMENT_INIT', 'CONTRACTOR', clone.id, existing.applicationId, clone.applicationId, req);

    res.status(201).json(clone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke on the server!' });
});

// Serve static frontend assets in production
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// Fallback all non-API and non-uploads routes to index.html for React Router
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Express server is running on http://localhost:${PORT}`);
});
