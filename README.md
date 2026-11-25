# ⚡ WattWise — Advanced Smart Energy Consumption Intelligence Platform

WattWise is an enterprise multi-tenant Smart Energy Consumption Intelligence Platform built with **Next.js 16 (App Router)**, **React 19.3**, **TypeScript 5.9**, **Tailwind CSS v4.1.9**, **Recharts**, **Node.js 24**, **Express.js v5**, and **MongoDB**.

It enables offices, factories, universities, and commercial portfolios to monitor, analyze, forecast, and optimize electricity consumption across organizations, buildings, floors, departments, and smart electricity meters.

---

## 1. Architecture & Monorepo Layout

* **`client/`** — Next.js 16 App Router Frontend (Port `3000`, Vercel-ready)
* **`server/`** — Node.js 24 + Express.js v5 REST API Backend (Port `5000`, Vercel Serverless-ready)
* **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Master System Architecture, Schemas, Indexes, RBAC Matrix & API Contracts
* **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** — Phased Multi-Model Task Breakdown
* **[AI_MODEL_WORKFLOW.md](./AI_MODEL_WORKFLOW.md)** — Cross-Model Handoff Protocol
* **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** — Living Completion & Requirements Tracker

---

## 2. Core Features & Bonus Challenges Implemented

* **Multi-Organization Hierarchy:** `Organization` → `Building` → `Floor` → `Department` → `Electricity Meter` → `Energy Record`.
* **4 Role-Based Access Control (RBAC) Tiers:**
  1. **Organization Admin (`org_admin`):** Full CRUD across organization settings, tariffs, buildings, floors, departments, meters, thresholds, alerts, reports, and users.
  2. **Facility Manager (`facility_manager`):** Scoped meter registration/configuration, consumption monitoring, threshold setup, alert lifecycle management (`New` → `Acknowledged` → `Resolved`), live simulation, and energy reports.
  3. **Department Manager (`department_manager`):** Department-scoped consumption, peer department comparison, budget vs actual cost monitoring, consumption history, department reports, and energy-saving insights.
  4. **Viewer (`viewer`):** Strictly read-only access to authorized dashboards, statistics, historical reports, comparisons, and analytics.
* **All 9 Bonus Challenges Included:**
  1. **Automated Energy Anomaly Detection** (Statistical Z-score outlier detection $\ge 2.2\sigma$)
  2. **Energy Consumption Forecasting** (30-day linear trend regression + day-of-week seasonality + 95% confidence band)
  3. **Carbon Emission Estimation** (Consistent `kg CO2e` calculation, tree-offset equivalents, and `kg/sq.ft` intensity)
  4. **Automated Energy Saving Recommendations** (Quantified monthly `kWh`, `$`, and `kg CO2e` savings across Baseload Waste, Peak Shifting, Power Factor, and Department Efficiency)
  5. **Real-Time Energy Monitoring Simulation** (Stateless live reading batch generator with live anomaly & alert evaluation)
  6. **Meter Health Monitoring** (`0–100%` fleet health score, firmware tracking, and diagnostic alerts)
  7. **Scheduled Energy Reports** (Recurring Daily/Weekly/Monthly report configurations with instant `Run & Download Now`)
  8. **PDF Report Generation** (Executive multi-section PDF reports using `jspdf` + `jspdf-autotable`, alongside RFC-4180 CSV streaming exports)
  9. **Dark Mode** (Industrial Dark Mode & Daylight Light Mode switcher powered by Tailwind CSS v4.1.9)

---

## 3. Local Quick Start

### Step 1: Start Backend (`server/`)
```bash
cd server
npm install
# Configure MONGODB_URI in server/.env (defaults to mongodb://127.0.0.1:27017/wattwise)
npm run seed
npm run dev
```

### Step 2: Start Frontend (`client/`)
```bash
cd client
npm install
# Configure NEXT_PUBLIC_API_URL in client/.env.local (defaults to http://localhost:5000/api/v1)
npm run dev
```

Open `http://localhost:3000` and use the **One-Click Demo Role Switcher** on the Login page to test any of the 12 seeded accounts across the 3 organizations (`Password123!`).

---

## 4. Deploying Frontend & Backend on Vercel

Both `server/` and `client/` are structured for native **Vercel Serverless Deployment**:

1. **Deploy Backend (`server/`):**
   * Import the repository into Vercel and set **Root Directory** to `server`.
   * Add Environment Variables in Vercel:
     * `MONGODB_URI` = your MongoDB Atlas connection string
     * `JWT_SECRET` = a strong secret string (16+ characters)
     * `CORS_ORIGIN` = `*` (or your frontend `.vercel.app` URL)
   * Deploy! (Note: On the very first visit to the Login page, `GET /api/v1/auth/demo-accounts` automatically seeds the MongoDB Atlas database if it is empty).

2. **Deploy Frontend (`client/`):**
   * Import the repository into Vercel as a second project and set **Root Directory** to `client`.
   * Add Environment Variable in Vercel:
     * `NEXT_PUBLIC_API_URL` = `https://<your-backend-vercel-domain>.vercel.app/api/v1`
   * Deploy!
