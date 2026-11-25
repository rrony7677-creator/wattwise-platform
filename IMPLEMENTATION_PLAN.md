# WATTWISE — Multi-Model Phased Implementation Plan

> **Purpose:** This document breaks the entire **WattWise** platform (all Core Requirements, Advanced Requirements, 12 Expected Pages, and all 9 Bonus Challenges from `WattWise.md`) into **8 logical Phases** and **26 self-contained Tasks**.  
> Each task is engineered so that **any AI model** in your workflow can pick it up, read the listed input files, write the exact output files, verify its work, and hand off cleanly to the next model without context loss.

---

## 1. AI Model Capability & Task Assignment Strategy

| AI Model | Core Strengths | Assigned Task Profile in WattWise |
| :--- | :--- | :--- |
| **Gemini 4 Argon** | Architecture, system design, multi-file contract alignment, complex auditing | Architectural reviews, milestone verification, cross-stack integration reviews |
| **Orchestrator (Argon)** | Coordinating multi-step execution, parallel task dispatch, integration verification | Managing multi-task phase rollouts, end-to-end build & test orchestration |
| **Claude Opus 5.5** | Deep algorithmic logic, MongoDB aggregation pipelines, security/RBAC middleware, complex intelligence engines | RBAC/Scope guards, Time-Series Aggregation Engine, Anomaly/Forecast/Insights/Simulator algorithms |
| **Gemini 4 Hydrogen** | High-reasoning backend/frontend engineering, data modeling, complex API orchestration | Mongoose schemas & compound indexes, core REST controllers, state synchronization |
| **Claude Sonnet 5.5** | Full-stack feature pages, interactive React 19 UI, Recharts data visualizations, Tailwind v4 styling | Dashboard UI, Recharts Analytics charts, Alert & Report UI, Entity CRUD pages |
| **Gemini 3.8 Flash** | Fast, deterministic scaffolding, configuration, seed scripts, UI primitives, utility helpers | Project initialization, package configs, shared TypeScript interfaces, UI primitives, deterministic seed script |

*(Note: Every task lists a **Primary Recommended Model** and a **Backup/Alternative Model** so you can switch freely based on availability or preference.)*

---

## 2. Phase-by-Phase Task Breakdown

---

### PHASE 1: Monorepo Foundation, Configs & Database Models
**Goal:** Initialize `server/` (Node.js 24 + Express.js v5 + TypeScript 5.9 + Mongoose) and `client/` (Next.js 16 App Router + React 19.3 + TypeScript 5.9 + Tailwind CSS v4.1.9 + Recharts), and implement all 10 MongoDB schemas with strict indexes.

#### **Task T1.1 — Backend Scaffolding & Express v5 Server Setup**
* **Primary Model:** `Gemini 3.8 Flash` *(Alternative: `Gemini 4 Hydrogen`)*
* **Dependencies:** None
* **Files to Read:** `ARCHITECTURE.md` (Sections 1, 2)
* **Files to Create:**
  * `server/package.json`
  * `server/tsconfig.json`
  * `server/.env.example` & `server/.env`
  * `server/src/config/env.ts`
  * `server/src/config/db.ts`
  * `server/src/types/index.ts`
  * `server/src/middleware/error.middleware.ts`
  * `server/src/middleware/validate.middleware.ts`
  * `server/src/app.ts`
  * `server/src/index.ts`
* **Implementation Details:**
  * Configure Express v5 (`express@^5.0.0`), `mongoose`, `cors`, `jsonwebtoken`, `bcryptjs`, `zod`, `dotenv`.
  * Implement `GET /api/v1/health` returning `{ success: true, data: { status: 'ok', timestamp } }`.
  * Standardize JSON response helper and centralized Express v5 error handler.
* **Verification:** Run `npm install` and `npx tsc --noEmit` inside `server/`.

#### **Task T1.2 — MongoDB Mongoose Models & Compound Indexes (All 10 Collections)**
* **Primary Model:** `Gemini 4 Hydrogen` *(Alternative: `Claude Opus 5.5`)*
* **Dependencies:** `T1.1`
* **Files to Read:** `ARCHITECTURE.md` (Section 4)
* **Files to Create:**
  * `server/src/models/Organization.ts`
  * `server/src/models/User.ts`
  * `server/src/models/Building.ts`
  * `server/src/models/Floor.ts`
  * `server/src/models/Department.ts`
  * `server/src/models/Meter.ts`
  * `server/src/models/EnergyRecord.ts`
  * `server/src/models/Threshold.ts`
  * `server/src/models/Alert.ts`
  * `server/src/models/ScheduledReport.ts`
  * `server/src/models/index.ts`
* **Implementation Details:**
  * Implement exact fields, enums, and compound indexes specified in `ARCHITECTURE.md` Section 4.
  * Enforce unique compound index `{ meterId: 1, timestamp: 1 }` on `EnergyRecord` to prevent duplicate energy records (Section 5).
  * Enforce time-series compound indexes `{ organizationId: 1, timestamp: -1 }`, `{ organizationId: 1, buildingId: 1, timestamp: -1 }`, and `{ organizationId: 1, departmentId: 1, timestamp: -1 }`.
* **Verification:** `npx tsc --noEmit` in `server/` passes with zero errors.

#### **Task T1.3 — Frontend Scaffolding (Next.js 16 + React 19.3 + Tailwind v4.1.9 + Recharts)**
* **Primary Model:** `Gemini 3.8 Flash` *(Alternative: `Claude Sonnet 5.5`)*
* **Dependencies:** None
* **Files to Read:** `ARCHITECTURE.md` (Sections 1, 2, 6)
* **Files to Create:**
  * `client/package.json`
  * `client/tsconfig.json`
  * `client/next.config.ts`
  * `client/postcss.config.mjs`
  * `client/.env.example` & `client/.env.local`
  * `client/src/app/globals.css` (Tailwind v4 `@import "tailwindcss";` + dark mode CSS custom properties & industrial energy color palette)
  * `client/src/types/index.ts` (All shared frontend TypeScript interfaces matching `ARCHITECTURE.md`)
  * `client/src/lib/formatters.ts`
  * `client/src/lib/api.ts`
* **Verification:** Run `npm install` and `npx tsc --noEmit` in `client/`.

---

### PHASE 2: Security, Authentication, Multi-Tenant RBAC & Caching
**Goal:** Enforce all Section 2 & Section 5 Security & Data Integrity requirements: JWT auth, multi-organization isolation, role/scope enforcement (`org_admin`, `facility_manager`, `department_manager`, `viewer`), and server-side dashboard caching.

#### **Task T2.1 — JWT Auth, RBAC Scope Guards & TTL Cache Middleware**
* **Primary Model:** `Claude Opus 5.5` *(Alternative: `Gemini 4 Hydrogen`)*
* **Dependencies:** `T1.1`, `T1.2`
* **Files to Read:** `ARCHITECTURE.md` (Section 5)
* **Files to Create:**
  * `server/src/middleware/auth.middleware.ts`
  * `server/src/middleware/rbac.middleware.ts`
  * `server/src/middleware/cache.middleware.ts`
* **Implementation Details:**
  * `authenticate`: Extracts Bearer JWT, verifies signature, loads active user context (`userId`, `organizationId`, `role`, `assignedBuildingIds`, `assignedDepartmentIds`, `assignedMeterIds`).
  * `requireRoles(...roles)`: Blocks unauthorized roles (e.g., enforces read-only on `viewer` for all POST/PATCH/DELETE routes).
  * `buildScopeFilter(req)`: Generates mandatory MongoDB query filter enforcing `organizationId: req.user.organizationId`, plus department restriction for `department_manager` and building/meter restriction for `facility_manager`.
  * `cacheMiddleware(ttlSeconds)`: Caches GET dashboard/analytics responses keyed by `orgId + userId + role + originalUrl`, with automatic cache invalidation helper `invalidateOrgCache(organizationId)` called when new records, meters, or alerts are mutated.
* **Verification:** `npx tsc --noEmit` in `server/`.

#### **Task T2.2 — Auth & User Management Controllers & Routes**
* **Primary Model:** `Gemini 4 Hydrogen` *(Alternative: `Claude Sonnet 5.5`)*
* **Dependencies:** `T2.1`
* **Files to Read:** `ARCHITECTURE.md` (Sections 5, 6.1)
* **Files to Create:**
  * `server/src/controllers/auth.controller.ts`
  * `server/src/routes/auth.routes.ts`
  * `server/src/controllers/user.controller.ts`
  * `server/src/routes/user.routes.ts`
* **Implementation Details:**
  * Implement `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/me`, and `/api/v1/auth/demo-accounts`.
  * Implement `/api/v1/users` (list, create user in org with role & scope assignments, update user role/scopes/status) and `/api/v1/users/profile/me` (update profile & preferences).
* **Verification:** `npx tsc --noEmit` in `server/`.

---

### PHASE 3: Organization Hierarchy & Meter Management Backend APIs
**Goal:** Implement full CRUD and relational validation for Organizations, Buildings, Floors, Departments, and Electricity Meters (including Bonus Meter Health Monitoring).

#### **Task T3.1 — Organization, Building, Floor & Department Controllers & Routes**
* **Primary Model:** `Gemini 4 Hydrogen` *(Alternative: `Claude Sonnet 5.5`)*
* **Dependencies:** `T2.1`
* **Files to Read:** `ARCHITECTURE.md` (Sections 4, 5, 6.1), `WattWise.md` (Section 3A)
* **Files to Create:**
  * `server/src/controllers/organization.controller.ts`
  * `server/src/routes/organization.routes.ts`
  * `server/src/controllers/building.controller.ts`
  * `server/src/routes/building.routes.ts`
  * `server/src/controllers/floor.controller.ts`
  * `server/src/routes/floor.routes.ts`
  * `server/src/controllers/department.controller.ts`
  * `server/src/routes/department.routes.ts`
* **Implementation Details:**
  * Strictly validate parent-child relationships (`Organization` -> `Building` -> `Floor` -> `Department`) so an entity can never reference a parent from a different organization.
  * Support server-side pagination, search (`q`), and parent entity filtering (`buildingId`, `floorId`).
* **Verification:** `npx tsc --noEmit` in `server/`.

#### **Task T3.2 — Electricity Meter Management & Meter Health Monitoring API**
* **Primary Model:** `Gemini 4 Hydrogen` *(Alternative: `Claude Sonnet 5.5`)*
* **Dependencies:** `T3.1`
* **Files to Read:** `ARCHITECTURE.md` (Sections 4.6, 5, 6.1)
* **Files to Create:**
  * `server/src/controllers/meter.controller.ts`
  * `server/src/routes/meter.routes.ts`
* **Implementation Details:**
  * Implement Meter registration (`POST /api/v1/meters`), update (`PATCH /api/v1/meters/:id`), scoped listing with search & filters (`GET /api/v1/meters`), and Bonus Meter Health Summary (`GET /api/v1/meters/health-summary`).
  * Enforce that `facility_manager` can only configure authorized meters/buildings.
* **Verification:** `npx tsc --noEmit` in `server/`.

---

### PHASE 4: Time-Series Energy Engine, Intelligence, Alerts & Bonus Services
**Goal:** Build the core algorithmic engine of WattWise: consistent cost & carbon calculation, statistical anomaly detection, threshold evaluation & alert lifecycle, time-series MongoDB aggregations, consumption forecasting, automated energy-saving recommendations, real-time monitoring simulator, and report generator.

#### **Task T4.1 — Cost/Carbon, Anomaly Detection & Alert Lifecycle Services**
* **Primary Model:** `Claude Opus 5.5` *(Alternative: `Gemini 4 Hydrogen`)*
* **Dependencies:** `T1.2`, `T2.1`
* **Files to Read:** `ARCHITECTURE.md` (Sections 4.7–4.9, 7.1, 7.2)
* **Files to Create:**
  * `server/src/services/costCarbon.service.ts`
  * `server/src/services/anomaly.service.ts`
  * `server/src/services/alertEngine.service.ts`
  * `server/src/controllers/alert.controller.ts`
  * `server/src/routes/alert.routes.ts`
* **Implementation Details:**
  * `costCarbon.service.ts`: Computes `estimatedCost` (peak vs base tariff) and `carbonKg` (`consumptionKwh * carbonFactorKgPerKwh`).
  * `anomaly.service.ts`: Computes rolling mean & standard deviation for the meter's profile; flags `isAnomaly` and `anomalyScore` (Z-score).
  * `alertEngine.service.ts`: Evaluates active building/department/meter `Threshold` rules and anomaly flags whenever energy records are ingested; creates `Alert` documents (`high_usage`, `unusual_consumption`, `meter_health`) with initial status `'New'`.
  * `alert.controller.ts`: Full CRUD for thresholds + paginated alert list + status transitions (`New` -> `Acknowledged` -> `Resolved`).
* **Verification:** `npx tsc --noEmit` in `server/`.

#### **Task T4.2 — Energy Records Ingestion, Real-Time Simulator & Time-Series Query API**
* **Primary Model:** `Claude Opus 5.5` *(Alternative: `Gemini 4 Hydrogen`)*
* **Dependencies:** `T4.1`
* **Files to Read:** `ARCHITECTURE.md` (Sections 4.7, 6.1 #7), `WattWise.md` (Sections 3B, 5, 6)
* **Files to Create:**
  * `server/src/services/simulator.service.ts`
  * `server/src/controllers/energyRecord.controller.ts`
  * `server/src/routes/energyRecord.routes.ts`
* **Implementation Details:**
  * Implement server-side paginated, multi-filter time-series query (`GET /api/v1/energy-records`) with date range, building, floor, department, meter, anomaly filter, and debounced search query.
  * Implement record creation (`POST /api/v1/energy-records`) with duplicate `{ meterId, timestamp }` prevention/upsert guard, automatic cost/carbon computation, anomaly detection, threshold evaluation, and org cache invalidation.
  * Implement Bonus Real-Time Energy Monitoring Simulation (`POST /api/v1/energy-records/simulate-tick`) that generates realistic live readings across active meters, updates meter health scores & `lastReadingAt`, and triggers live threshold/anomaly alerts.
  * Prohibit deletion of historical energy records (Section 5).
* **Verification:** `npx tsc --noEmit` in `server/`.

#### **Task T4.3 — Server-Side Aggregations, Forecasting & Energy Insights Engine**
* **Primary Model:** `Claude Opus 5.5` *(Alternative: `Gemini 4 Argon`)*
* **Dependencies:** `T4.1`, `T4.2`
* **Files to Read:** `ARCHITECTURE.md` (Sections 6.1 #8 & #9, 7.3, 7.4), `WattWise.md` (Sections 3C, 3E, 3F, 4, 6)
* **Files to Create:**
  * `server/src/services/aggregation.service.ts`
  * `server/src/services/forecast.service.ts`
  * `server/src/services/insights.service.ts`
  * `server/src/controllers/dashboard.controller.ts`
  * `server/src/routes/dashboard.routes.ts`
  * `server/src/controllers/analytics.controller.ts`
  * `server/src/routes/analytics.routes.ts`
* **Implementation Details:**
  * `aggregation.service.ts`: MongoDB `$match` + `$group` + `$facet` pipelines for:
    * Dashboard KPIs (Total kWh, Total Cost, Total Carbon, Avg Daily Usage, Peak Consumption, Lowest Consumption, Previous Month/Period Comparison %, Building-wise, Department-wise, Meter-wise breakdowns).
    * Time-Series Charts (`hourly`, `daily`, `weekly`, `monthly` granularities).
    * Building Comparison, Department Comparison, and Cost & Trend Analysis.
  * `forecast.service.ts`: 7-to-14 day daily energy & cost forecast using linear trend + day-of-week seasonality multipliers + 95% confidence bounds.
  * `insights.service.ts`: Unusual consumption events, highest usage entities, peak usage hours, historical comparison, Carbon ESG metrics, and quantified Automated Energy Saving Recommendations.
* **Verification:** `npx tsc --noEmit` in `server/`.

#### **Task T4.4 — Reports, CSV Streaming Export & Scheduled Reports API + Route Registration**
* **Primary Model:** `Gemini 4 Hydrogen` *(Alternative: `Claude Sonnet 5.5`)*
* **Dependencies:** `T2.2`, `T3.2`, `T4.3`
* **Files to Read:** `ARCHITECTURE.md` (Sections 4.10, 6.1 #11)
* **Files to Create / Modify:**
  * `server/src/services/reportGenerator.service.ts`
  * `server/src/controllers/report.controller.ts`
  * `server/src/routes/report.routes.ts`
  * `server/src/routes/index.ts` (Mount all 12 route modules onto `/api/v1`)
* **Implementation Details:**
  * Custom date range report aggregation (`GET /api/v1/reports/generate`), server-side CSV export (`GET /api/v1/reports/export-csv`), and Scheduled Reports CRUD + `run-now` execution (`/api/v1/reports/scheduled`).
* **Verification:** `npx tsc --noEmit` in `server/` passes cleanly across the entire backend.

---

### PHASE 5: High-Volume Realistic Dataset Seeder (3+ Orgs, 10+ Bldgs, 30+ Floors, 50+ Depts, 5,000+ Records)
**Goal:** Build the deterministic seed generator satisfying Section 7 Minimum Data Requirements and verify all backend endpoints against real MongoDB data.

#### **Task T5.1 — Deterministic Dataset Seeder (`seed.ts`) & Backend Smoke Test**
* **Primary Model:** `Gemini 3.8 Flash` *(Alternative: `Gemini 4 Hydrogen`)*
* **Dependencies:** `T4.4`
* **Files to Read:** `ARCHITECTURE.md` (Section 8), `WattWise.md` (Section 7)
* **Files to Create:**
  * `server/src/seed/seed.ts`
* **Implementation Details:**
  * Generates:
    * **3 Organizations** (`Apex Global Manufacturing`, `MetroTech University Campus`, `Horizon Commercial Towers`)
    * **10 Buildings** (4 + 3 + 3)
    * **30 Floors** (3 per building)
    * **54 Departments** (>= 50 required)
    * **60 Electricity Meters** (with realistic health scores, firmware, types)
    * **12 Users** (all 4 roles `org_admin`, `facility_manager`, `department_manager`, `viewer` for each of the 3 organizations, with known password `Password123!`)
    * **7,200+ Energy Records** (exceeding the 5,000+ requirement) spanning 35 days (current month + previous month) with realistic diurnal load curves, weekend reductions, peak tariff costs, carbon emissions, and injected anomalies.
    * **15 Thresholds** & **35 Alerts** across `New`, `Acknowledged`, and `Resolved` states.
    * **6 Scheduled Reports**.
  * Uses bulk `insertMany` batches for fast execution (< 5 seconds).
* **Verification:** Run `npm run seed` in `server/` and verify document counts in MongoDB.

---

### PHASE 6: Frontend Core Shell, Auth, Theme (Dark Mode), Reusable UI & Recharts Suite
**Goal:** Build the frontend foundation in `client/`: Auth & Dark Mode contexts, role-aware Sidebar & Header shell, reusable industrial UI primitives, filter/debounce hooks, CSV/PDF export utilities, and all required Recharts components.

#### **Task T6.1 — Auth Context, Dark Mode Theme Context, Hooks & Export Utilities**
* **Primary Model:** `Claude Sonnet 5.5` *(Alternative: `Gemini 4 Hydrogen`)*
* **Dependencies:** `T1.3`
* **Files to Read:** `ARCHITECTURE.md` (Sections 2, 5)
* **Files to Create:**
  * `client/src/lib/auth-context.tsx`
  * `client/src/lib/theme-context.tsx`
  * `client/src/lib/export-utils.ts` (Client CSV & PDF report generator using `jspdf` + `jspdf-autotable`)
  * `client/src/hooks/useDebounce.ts`
  * `client/src/hooks/useFilterState.ts`
  * `client/src/hooks/useRealtimeSim.ts`
* **Verification:** `npx tsc --noEmit` in `client/`.

#### **Task T6.2 — Reusable UI Primitives & Layout Shell (Sidebar, Header, RoleGuard)**
* **Primary Model:** `Claude Sonnet 5.5` *(Alternative: `Gemini 3.8 Flash`)*
* **Dependencies:** `T6.1`
* **Files to Read:** `ARCHITECTURE.md` (Sections 2, 5.2), `WattWise.md` (Section 8)
* **Files to Create:**
  * `client/src/components/ui/index.tsx` (Cards, KPI Stat Cards, Modals, DataTables, Server Pagination Bar, Badges, Status Pills, DateRangePicker, Debounced SearchInput, Loading Skeletons, Error State Banner, Empty State)
  * `client/src/components/layout/RoleGuard.tsx`
  * `client/src/components/layout/AppSidebar.tsx` (Navigation for all 11 authenticated pages with role indicators)
  * `client/src/components/layout/AppHeader.tsx` (Active Org & Role badge, Real-Time Simulator live toggle button, Unread Alerts badge, Dark/Light Mode toggle, User quick menu)
  * `client/src/app/layout.tsx`
  * `client/src/app/page.tsx`
  * `client/src/app/(dashboard)/layout.tsx`
* **Verification:** `npx tsc --noEmit` in `client/`.

#### **Task T6.3 — Recharts Visualization Suite & Energy Insights Components**
* **Primary Model:** `Claude Sonnet 5.5` *(Alternative: `Claude Opus 5.5`)*
* **Dependencies:** `T6.2`
* **Files to Read:** `ARCHITECTURE.md` (Sections 2, 7), `WattWise.md` (Sections 3E, 3F, 6)
* **Files to Create:**
  * `client/src/components/charts/HourlyUsageChart.tsx`
  * `client/src/components/charts/DailyUsageChart.tsx`
  * `client/src/components/charts/MonthlyUsageChart.tsx`
  * `client/src/components/charts/BuildingComparisonChart.tsx`
  * `client/src/components/charts/DepartmentComparisonChart.tsx`
  * `client/src/components/charts/CostCarbonTrendChart.tsx`
  * `client/src/components/charts/ForecastAnomalyChart.tsx`
  * `client/src/components/insights/InsightsPanel.tsx`
  * `client/src/components/insights/RecommendationsList.tsx`
  * `client/src/components/insights/MeterHealthGrid.tsx`
* **Implementation Details:**
  * All charts must be responsive (`ResponsiveContainer`), support Dark Mode & Light Mode palettes cleanly, include rich custom tooltips (showing kWh, Estimated Cost $, and Carbon kg CO2e), and handle empty/loading states gracefully.
* **Verification:** `npx tsc --noEmit` in `client/`.

---

### PHASE 7: Implementation of All 12 Expected Pages
**Goal:** Build all 12 expected pages specified in `WattWise.md` Section 8 with full backend integration, RBAC enforcement, loading/error states, debounced search, date range filtering, and bonus features.

#### **Task T7.1 — Page 1: Login & Registration (`(auth)/login` & `(auth)/register`)**
* **Primary Model:** `Claude Sonnet 5.5` *(Alternative: `Gemini 3.8 Flash`)*
* **Dependencies:** `T6.2`
* **Files to Read:** `ARCHITECTURE.md` (Section 6.1 #1), `WattWise.md` (Sections 2, 8)
* **Files to Create:**
  * `client/src/app/(auth)/login/page.tsx`
  * `client/src/app/(auth)/register/page.tsx`
* **Implementation Details:**
  * Login form with email/password validation + **One-Click Demo Role Switcher Cards** (Organization Admin, Facility Manager, Department Manager, Viewer across the 3 seeded organizations) for effortless evaluation of all RBAC rules.
  * Registration form allowing creation of a new Organization + Admin account.
* **Verification:** `npx tsc --noEmit` in `client/`.

#### **Task T7.2 — Page 2: Organization Dashboard (`/dashboard`)**
* **Primary Model:** `Claude Sonnet 5.5` *(Alternative: `Claude Opus 5.5`)*
* **Dependencies:** `T6.3`
* **Files to Read:** `WattWise.md` (Section 3C), `ARCHITECTURE.md` (Section 6.1 #8)
* **Files to Create:**
  * `client/src/app/(dashboard)/dashboard/page.tsx`
* **Implementation Details:**
  * Displays all required Section 3C metrics: Total Energy Consumption, Total Electricity Cost, Average Daily Usage, Peak Consumption, Lowest Consumption, Previous Month/Period Comparison (% delta badge), plus Carbon Emissions (kg CO2e) and Active Alerts counter.
  * Interactive Date Range Selector (7D, 30D, This Month, Last Month, Custom Date Range) & Period Comparison toggle + Building/Department filter dropdowns.
  * Visualizes Building-wise Consumption, Department-wise Consumption, and Meter-wise Consumption + Daily/Hourly Consumption Trend chart + Real-Time Simulation Live Feed banner.
* **Verification:** `npx tsc --noEmit` in `client/`.

#### **Task T7.3 — Pages 3, 4 & 5: Building, Floor & Department Management (`/buildings`, `/floors`, `/departments`)**
* **Primary Model:** `Claude Sonnet 5.5` *(Alternative: `Gemini 4 Hydrogen`)*
* **Dependencies:** `T6.2`
* **Files to Read:** `WattWise.md` (Sections 2, 3A, 8), `ARCHITECTURE.md` (Sections 5.2, 6.1 #3–#5)
* **Files to Create:**
  * `client/src/app/(dashboard)/buildings/page.tsx`
  * `client/src/app/(dashboard)/floors/page.tsx`
  * `client/src/app/(dashboard)/departments/page.tsx`
* **Implementation Details:**
  * Server-paginated lists with debounced search, parent filter dropdowns (e.g. filter Floors by Building; filter Departments by Building & Floor), consumption/budget utilization metrics, and Create/Edit modals gated strictly to `org_admin` (read-only view for other roles).
* **Verification:** `npx tsc --noEmit` in `client/`.

#### **Task T7.4 — Page 6: Meter Management & Meter Health Monitoring (`/meters`)**
* **Primary Model:** `Claude Sonnet 5.5` *(Alternative: `Gemini 4 Hydrogen`)*
* **Dependencies:** `T6.3`
* **Files to Read:** `WattWise.md` (Sections 2, 3A, 6, 8), `ARCHITECTURE.md` (Section 6.1 #6)
* **Files to Create:**
  * `client/src/app/(dashboard)/meters/page.tsx`
* **Implementation Details:**
  * Complete Meter inventory with debounced search, Building/Floor/Department/Type/Status filtering, server-side pagination, and Register/Configure Meter modal for `org_admin` and `facility_manager`.
  * Includes Bonus **Meter Health Monitoring** dashboard view (`MeterHealthGrid`) displaying health score gauges (0–100%), firmware versions, last reading timestamps, and status indicators (`active`, `warning`, `offline`, `maintenance`).
* **Verification:** `npx tsc --noEmit` in `client/`.

#### **Task T7.5 — Page 7: Energy Records (`/records`)**
* **Primary Model:** `Claude Sonnet 5.5` *(Alternative: `Gemini 4 Hydrogen`)*
* **Dependencies:** `T6.2`
* **Files to Read:** `WattWise.md` (Sections 3B, 4, 5, 8), `ARCHITECTURE.md` (Section 6.1 #7)
* **Files to Create:**
  * `client/src/app/(dashboard)/records/page.tsx`
* **Implementation Details:**
  * High-performance server-paginated table of time-series Energy Records showing Meter ID/Code, Building, Floor, Department, Consumption (kWh), Estimated Cost ($), Carbon (kg CO2e), Peak Demand (kW), Anomaly Badge, and Timestamp.
  * Full filter bar: Start/End Date Range, Building, Floor, Department, Meter, Anomaly-only toggle, and debounced search.
  * "Add Energy Record" modal (`org_admin`, `facility_manager`), "Simulate Live Reading Tick" trigger button, and one-click **CSV Export** of filtered records.
* **Verification:** `npx tsc --noEmit` in `client/`.

#### **Task T7.6 — Page 8: Energy Analytics, Insights, Forecasting & Carbon (`/analytics`)**
* **Primary Model:** `Claude Sonnet 5.5` *(Alternative: `Claude Opus 5.5`)*
* **Dependencies:** `T6.3`
* **Files to Read:** `WattWise.md` (Sections 3E, 3F, 6, 8), `ARCHITECTURE.md` (Sections 6.1 #9, 7)
* **Files to Create:**
  * `client/src/app/(dashboard)/analytics/page.tsx`
* **Implementation Details:**
  * Renders all required Section 3E charts with dynamic granularity switcher and date/building/department filters:
    1. Hourly Usage Chart
    2. Daily Usage Chart
    3. Monthly / Weekly Usage Chart
    4. Building Comparison Chart
    5. Department Comparison Chart
    6. Cost Analysis & Consumption Trend Chart
  * Renders Section 3F Energy Insights & Section 6 Bonus Intelligence tabs:
    * **Energy Consumption Forecasting Chart** (next 7–14 days projection with 95% confidence band)
    * **Automated Anomaly & Peak Detection** table/cards (highest usage entities, peak hours, statistical Z-score anomalies)
    * **Automated Energy Saving Recommendations** cards with quantified monthly kWh, $, and CO2 savings
    * **Carbon Emission Estimation** panel (total kg CO2e, tree equivalents, building emission intensity).
* **Verification:** `npx tsc --noEmit` in `client/`.

#### **Task T7.7 — Page 9: Alert Management & Threshold Setup (`/alerts`)**
* **Primary Model:** `Claude Sonnet 5.5` *(Alternative: `Gemini 4 Hydrogen`)*
* **Dependencies:** `T6.2`
* **Files to Read:** `WattWise.md` (Sections 3D, 8), `ARCHITECTURE.md` (Sections 4.8, 4.9, 6.1 #10)
* **Files to Create:**
  * `client/src/app/(dashboard)/alerts/page.tsx`
* **Implementation Details:**
  * Two coordinated tabs/views:
    1. **Alert History & Lifecycle Queue:** Filter by status (`New`, `Acknowledged`, `Resolved`), severity (`warning`, `critical`), alert type (`high_usage`, `unusual_consumption`, `meter_health`), building, and meter. One-click **Acknowledge** and **Resolve** (with resolution notes) buttons for `org_admin` and `facility_manager`.
    2. **Consumption Threshold Configuration:** Create, edit, toggle, and delete Building-specific, Department-specific, and Meter-specific thresholds (`hourly`, `daily`, `monthly` warning & critical limits).
* **Verification:** `npx tsc --noEmit` in `client/`.

#### **Task T7.8 — Page 10: Reports, Scheduled Reports & CSV/PDF Export (`/reports`)**
* **Primary Model:** `Claude Sonnet 5.5` *(Alternative: `Gemini 4 Hydrogen`)*
* **Dependencies:** `T6.1`, `T6.2`
* **Files to Read:** `WattWise.md` (Sections 3E, 4, 6, 8), `ARCHITECTURE.md` (Section 6.1 #11)
* **Files to Create:**
  * `client/src/app/(dashboard)/reports/page.tsx`
* **Implementation Details:**
  * **Custom Date Range Report Generator:** Select report type (Executive Summary, Building Breakdown, Department Cost & Consumption, Anomaly Audit, Carbon & ESG), custom date range, building, and department scope -> renders live interactive report preview table & summary KPIs.
  * **Export Actions:** Instant **Export CSV** (server stream or client export) and **Export PDF** (formatted multi-section executive PDF report with tables, KPIs, organization header, and timestamp).
  * **Bonus Scheduled Energy Reports Manager:** Create, view, toggle, and trigger ("Run Now") recurring daily/weekly/monthly scheduled reports in CSV or PDF format.
* **Verification:** `npx tsc --noEmit` in `client/`.

#### **Task T7.9 — Pages 11 & 12: User Management (`/users`) & Profile Settings (`/profile`)**
* **Primary Model:** `Claude Sonnet 5.5` *(Alternative: `Gemini 3.8 Flash`)*
* **Dependencies:** `T6.2`
* **Files to Read:** `WattWise.md` (Sections 2, 3A, 5, 8), `ARCHITECTURE.md` (Section 6.1 #2 & #12)
* **Files to Create:**
  * `client/src/app/(dashboard)/users/page.tsx`
  * `client/src/app/(dashboard)/profile/page.tsx`
* **Implementation Details:**
  * `/users`: Organization-wise user management (`org_admin` only, with clean access-denied view or redirect for other roles). Create user, assign role (`org_admin`, `facility_manager`, `department_manager`, `viewer`), assign authorized Buildings, Departments, and Meters, and toggle active status.
  * `/profile`: Personal profile settings (name, job title, phone, theme preference Dark/Light/System) + Organization Information & Tariff Settings management panel (editable by `org_admin`, read-only for other roles).
* **Verification:** `npx tsc --noEmit` in `client/`.

---

### PHASE 8: End-to-End Integration, Verification & Polish
**Goal:** Run full build & type checks across both `server/` and `client/`, verify the seeded database, test all 4 user roles and 12 pages end-to-end, and confirm zero regressions.

#### **Task T8.1 — Full-Stack Type Check, Production Build & RBAC Audit**
* **Primary Model:** `Gemini 4 Argon` or `Orchestrator (Argon)` *(Alternative: `Claude Opus 5.5`)*
* **Dependencies:** `T5.1`, `T7.1`–`T7.9`
* **Files to Read:** `PROJECT_STATUS.md`, `WattWise.md`
* **Verification Steps:**
  1. `server`: `npx tsc --noEmit` and `npm run seed`
  2. `client`: `npx tsc --noEmit` and `npm run build`
  3. Verify all 12 routes, all 4 roles (`org_admin`, `facility_manager`, `department_manager`, `viewer`), and all 9 bonus challenges against `WattWise.md`.
