# Contractor Pre-qualification & Empanelment System

A complete, production-ready, full-stack monorepo built for **AVINASH KANAPARTHI INFRA PRIVATE LIMITED (AKIPL)** to manage and evaluate contractor credentials, technical capacities, financial standings, and past project references.

---

## 🏗️ Tech Stack

- **Frontend**: React + Vite + Tailwind CSS + Framer Motion (page animations, collapsible sidebar, sliders, and drawers) + Recharts (KPI charts)
- **Backend**: Node.js + Express.js + REST API endpoints + JWT Authentication
- **Database**: Prisma ORM with SQLite (configured for immediate zero-dependency running) and full PostgreSQL readiness.
- **Audit & Compliance**: Automated system audit logs, live weighted scoring engine, and document verification checklist.

---

## 🚀 Setup & Execution Instructions

### 1. Prerequisite
Ensure you have **Node.js** (v18 or higher) and **npm** installed on your system.

### 2. Auto Setup (Install Dependencies, Migrate DB, and Seed)
To automate the installation of packages in all project directories, initialize the SQLite database, and populate seed data:
```bash
npm run setup
```
*(This installs root, backend, and frontend packages, runs the Prisma push, and seeds the database).*

### 3. Run Development Server
To launch both the Node/Express backend (port `5000`) and the Vite React frontend (port `5173`) concurrently:
```bash
npm run dev
```

- **Frontend Link**: [http://localhost:5173](http://localhost:5173)
- **Backend Link**: [http://localhost:5000](http://localhost:5000)

---

## 🔑 Demo Access Credentials

To test the role-based flows immediately, use these default accounts (password passwords are already pre-filled in the login panel):

1. **Admin Portal**:
   - **Email**: `admin@akipl.com`
   - **Password**: `admin123`
   - **Access**: Full settings weights configurations, user accounts creation, blacklisting, exports, and global audit trails.

2. **Staff Review Panel**:
   - **Email**: `staff@akipl.com`
   - **Password**: `staff123`
   - **Access**: Applications table search/filters, evaluation sliders scoring panel, audit trail viewing, and vendor profile reviews.

3. **Contractor Portal**:
   - **Email**: `contractor@akipl.com`
   - **Password**: `contractor123`
   - **Access**: 6-Step Pre-qualification Wizard, timeline trackers, document compliance checklist, and printable certificates.

---

## 🗄️ PostgreSQL Transition Guide

To transition the database from SQLite to PostgreSQL:
1. Open the [schema.prisma](file:///c:/Users/sathvika/OneDrive/Desktop/contractor%20prequalification%20and%20empanelment%20system%252011/backend/prisma/schema.prisma) file.
2. Modify the datasource block:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Open `backend/.env` and replace `DATABASE_URL` with your PostgreSQL connection string:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/akipl_empanelment?schema=public"
   ```
4. Run migrations and re-seed:
   ```bash
   npm run prisma:migrate
   npm run prisma:seed
   ```

---

## 📋 Features Checklist

### 1. UI/UX Design & Theme
- [x] Primary Corporate Navy (`#0F2B5B`) and Accent Orange (`#F97316`) theme.
- [x] Collapsible sidebar (desktop) and hamburger menu (mobile).
- [x] Fade + slide-up page transition animations.
- [x] Animated number count-ups for KPIs.
- [x] Shimmer skeleton loader states.
- [x] Dynamic pulse ring indicators for active review milestones.
- [x] Print CSS stylesheet for clean vendor certificate print layouts.

### 2. User Roles & Authentication
- [x] JWT tokens login/logout.
- [x] Custom icon-button card selectors for login portals.
- [x] Mock password recovery dialog panel.

### 3. Staff & Admin Dashboards
- [x] Count-up KPI metrics (Total Applications, Approved Vendors, Under Review, Avg. Processing Days).
- [x] Recharts status donut, monthly submission bars, and category horizontal bars.
- [x] Recent audit activity log feed on homepage.

### 4. Multi-Step Contractor Form
- [x] 6-Step form wizard (Company Info, Technical Capacity, Project References, Financials, Uploads, Review).
- [x] Top-aligned animated completion progress bar.
- [x] 30-Second background draft auto-save showing toast logs.
- [x] Add/remove rows for specialized equipments and past project references.
- [x] File drop-zones with simulated upload progress bars.

### 5. Staff Review Console
- [x] Searchable, paginated applications registry.
- [x] Multi-dimensional filters (Category, Status, Date, Score Range).
- [x] Row click detailing tab panels (Profile, Technical, References, Financials, Uploads, Audit Log).
- [x] Slider scoring evaluations auto-calculating weighted averages (Tech 40% + Fin 35% + Ref 25%).
- [x] Re-review flags.
- [x] Decision status controls (Approve/Reject with reasons).

### 6. Empanelled Vendor Registry
- [x] Grid card / Table list view toggles.
- [x] Vendor performance stars based on evaluation scores.
- [x] Expiry indicators (Amber badge if expiring within 60 days, Red if expired).
- [x] Contact triggers and renewals apply button.
