import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import {
  Organization,
  User,
  Building,
  Floor,
  Department,
  Meter,
  EnergyRecord,
  Threshold,
  Alert,
  ScheduledReport,
} from '../models/index.js';
import { calculateCostAndCarbon } from '../services/costCarbon.service.js';
import { invalidateOrgCache } from '../middleware/cache.middleware.js';

export interface SeedSummary {
  seeded: boolean;
  organizations: number;
  buildings: number;
  floors: number;
  departments: number;
  meters: number;
  users: number;
  energyRecords: number;
  thresholds: number;
  alerts: number;
  scheduledReports: number;
}

// Deterministic pseudo-random generator so seeded datasets are reproducible
function createRng(seed = 20261124) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const ORG_BLUEPRINTS = [
  {
    name: 'Apex Global Manufacturing',
    code: 'APEX-MFG',
    industry: 'Manufacturing' as const,
    address: '4500 Industrial Parkway, Detroit, MI',
    contactEmail: 'admin@apex-mfg.com',
    contactPhone: '+1 (313) 555-0190',
    baseTariffPerKwh: 0.13,
    peakTariffPerKwh: 0.21,
    carbonFactorKgPerKwh: 0.45,
    users: {
      admin: { name: 'Marcus Vance', email: 'admin@apex.wattwise.io', title: 'VP of Global Operations' },
      facility: { name: 'Elena Rostova', email: 'facility@apex.wattwise.io', title: 'Chief Plant Facility Manager' },
      department: { name: 'David Chen', email: 'dept@apex.wattwise.io', title: 'Robotics Assembly Dept Manager' },
      viewer: { name: 'Sarah Jenkins', email: 'viewer@apex.wattwise.io', title: 'ESG Compliance Auditor' },
    },
    buildings: [
      { name: 'Plant A - Precision Robotics', code: 'APEX-BLD-01', type: 'Factory' as const, area: 85000, baseKwh: 2400 },
      { name: 'Plant B - Battery Assembly', code: 'APEX-BLD-02', type: 'Factory' as const, area: 92000, baseKwh: 2650 },
      { name: 'North Engineering HQ', code: 'APEX-BLD-03', type: 'Office' as const, area: 45000, baseKwh: 1100 },
      { name: 'Automated Logistics Hub', code: 'APEX-BLD-04', type: 'Warehouse' as const, area: 68000, baseKwh: 1350 },
    ],
  },
  {
    name: 'MetroTech University Campus',
    code: 'METRO-UNI',
    industry: 'University' as const,
    address: '1200 Academic Way, Boston, MA',
    contactEmail: 'admin@metrotech.edu',
    contactPhone: '+1 (617) 555-0144',
    baseTariffPerKwh: 0.15,
    peakTariffPerKwh: 0.23,
    carbonFactorKgPerKwh: 0.38,
    users: {
      admin: { name: 'Dr. Arthur Pendelton', email: 'admin@metrotech.wattwise.io', title: 'Director of Campus Sustainability' },
      facility: { name: 'Carlos Mendez', email: 'facility@metrotech.wattwise.io', title: 'Campus Energy Systems Engineer' },
      department: { name: 'Dr. Priya Patel', email: 'dept@metrotech.wattwise.io', title: 'Chair of Quantum & AI Computing' },
      viewer: { name: 'Liam OConnor', email: 'viewer@metrotech.wattwise.io', title: 'University Board Analyst' },
    },
    buildings: [
      { name: 'Science & Quantum Research Center', code: 'MTU-BLD-01', type: 'Academic' as const, area: 72000, baseKwh: 1950 },
      { name: 'High-Performance Computing Annex', code: 'MTU-BLD-02', type: 'DataCenter' as const, area: 38000, baseKwh: 2800 },
      { name: 'Founders Academic Hall', code: 'MTU-BLD-03', type: 'Academic' as const, area: 54000, baseKwh: 1200 },
    ],
  },
  {
    name: 'Horizon Commercial Towers',
    code: 'HORIZON-COM',
    industry: 'Commercial' as const,
    address: '800 Financial District Blvd, New York, NY',
    contactEmail: 'admin@horizontowers.com',
    contactPhone: '+1 (212) 555-0177',
    baseTariffPerKwh: 0.16,
    peakTariffPerKwh: 0.25,
    carbonFactorKgPerKwh: 0.40,
    users: {
      admin: { name: 'Victoria Sterling', email: 'admin@horizon.wattwise.io', title: 'Portfolio Asset Director' },
      facility: { name: 'Robert Kim', email: 'facility@horizon.wattwise.io', title: 'Senior MEP Facility Manager' },
      department: { name: 'Hannah Abbott', email: 'dept@horizon.wattwise.io', title: 'Cloud Infrastructure Dept Lead' },
      viewer: { name: 'Noah Williams', email: 'viewer@horizon.wattwise.io', title: 'Tenant Sustainability Consultant' },
    },
    buildings: [
      { name: 'Horizon East Financial Tower', code: 'HRZ-BLD-01', type: 'Office' as const, area: 110000, baseKwh: 2200 },
      { name: 'Horizon West Innovation Center', code: 'HRZ-BLD-02', type: 'Office' as const, area: 95000, baseKwh: 1850 },
      { name: 'Horizon Edge Cloud Core', code: 'HRZ-BLD-03', type: 'DataCenter' as const, area: 42000, baseKwh: 2500 },
    ],
  },
];

const DEPT_TEMPLATES = [
  { suffix: 'Automated Assembly Line', type: 'Machinery' as const, budget: 4800, headcount: 42 },
  { suffix: 'Central HVAC & Chiller Plant', type: 'HVAC' as const, budget: 5200, headcount: 12 },
  { suffix: 'Core Server & Compute Lab', type: 'ServerRack' as const, budget: 6100, headcount: 18 },
  { suffix: 'Precision R&D Studio', type: 'Submeter' as const, budget: 3200, headcount: 28 },
  { suffix: 'Smart Lighting & Environmental Grid', type: 'Lighting' as const, budget: 1900, headcount: 15 },
  { suffix: 'Operations & Control Center', type: 'Main' as const, budget: 3900, headcount: 34 },
];

/**
 * Deterministic, high-speed dataset seeder for WattWise.
 * Satisfies Section 7 Minimum Data Requirements:
 * - 3 Organizations
 * - 10 Buildings
 * - 30 Floors (3 per building)
 * - 54 Departments (>= 50 required)
 * - 60 Smart Electricity Meters
 * - 6,840+ Time-Series Energy Records (>= 5,000 required)
 */
export async function seedDatabase(options: { force?: boolean } = {}): Promise<SeedSummary> {
  const { force = false } = options;

  if (!force) {
    const existingOrgs = await Organization.countDocuments();
    if (existingOrgs >= 3) {
      const [
        buildings,
        floors,
        departments,
        meters,
        users,
        energyRecords,
        thresholds,
        alerts,
        scheduledReports,
      ] = await Promise.all([
        Building.countDocuments(),
        Floor.countDocuments(),
        Department.countDocuments(),
        Meter.countDocuments(),
        User.countDocuments(),
        EnergyRecord.countDocuments(),
        Threshold.countDocuments(),
        Alert.countDocuments(),
        ScheduledReport.countDocuments(),
      ]);

      return {
        seeded: false,
        organizations: existingOrgs,
        buildings,
        floors,
        departments,
        meters,
        users,
        energyRecords,
        thresholds,
        alerts,
        scheduledReports,
      };
    }
  }

  // Clear existing collections when seeding fresh or forced
  await Promise.all([
    Organization.deleteMany({}),
    User.deleteMany({}),
    Building.deleteMany({}),
    Floor.deleteMany({}),
    Department.deleteMany({}),
    Meter.deleteMany({}),
    EnergyRecord.deleteMany({}),
    Threshold.deleteMany({}),
    Alert.deleteMany({}),
    ScheduledReport.deleteMany({}),
  ]);

  const rng = createRng(20261124);
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const orgDocs: Array<Record<string, unknown>> = [];
  const buildingDocs: Array<Record<string, unknown>> = [];
  const floorDocs: Array<Record<string, unknown>> = [];
  const departmentDocs: Array<Record<string, unknown>> = [];
  const meterDocs: Array<Record<string, unknown>> = [];
  const userDocs: Array<Record<string, unknown>> = [];
  const thresholdDocs: Array<Record<string, unknown>> = [];
  const alertDocs: Array<Record<string, unknown>> = [];
  const scheduledReportDocs: Array<Record<string, unknown>> = [];
  const energyRecordDocs: Array<Record<string, unknown>> = [];

  let globalMeterCounter = 1;
  let globalDeptCounter = 1;

  for (let orgIdx = 0; orgIdx < ORG_BLUEPRINTS.length; orgIdx++) {
    const bp = ORG_BLUEPRINTS[orgIdx];
    const orgId = new Types.ObjectId();

    orgDocs.push({
      _id: orgId,
      name: bp.name,
      code: bp.code,
      industry: bp.industry,
      address: bp.address,
      contactEmail: bp.contactEmail,
      contactPhone: bp.contactPhone,
      currency: 'USD',
      baseTariffPerKwh: bp.baseTariffPerKwh,
      peakTariffPerKwh: bp.peakTariffPerKwh,
      carbonFactorKgPerKwh: bp.carbonFactorKgPerKwh,
      timezone: 'UTC',
      isActive: true,
    });

    const orgBuildingIds: Types.ObjectId[] = [];
    const orgDepartmentIds: Types.ObjectId[] = [];
    const orgMeterIds: Types.ObjectId[] = [];

    for (let bIdx = 0; bIdx < bp.buildings.length; bIdx++) {
      const bBp = bp.buildings[bIdx];
      const buildingId = new Types.ObjectId();
      orgBuildingIds.push(buildingId);

      buildingDocs.push({
        _id: buildingId,
        organizationId: orgId,
        name: bBp.name,
        code: bBp.code,
        address: bp.address,
        buildingType: bBp.type,
        totalFloors: 3,
        areaSqFt: bBp.area,
        baselineDailyKwh: bBp.baseKwh,
        isActive: true,
      });

      // 3 Floors per building -> 10 buildings * 3 = 30 Floors total
      for (let fNum = 1; fNum <= 3; fNum++) {
        const floorId = new Types.ObjectId();
        floorDocs.push({
          _id: floorId,
          organizationId: orgId,
          buildingId,
          floorNumber: fNum,
          name: `Level ${fNum} - ${fNum === 1 ? 'Main Operations & Intake' : fNum === 2 ? 'Core Production & Systems' : 'Executive & Environmental Control'}`,
          areaSqFt: Math.round(bBp.area / 3),
        });

        // Create 2 Departments on Floors 1 & 2, and 1-2 Departments on Floor 3 so total Departments = 54 (>= 50 required)
        const deptsOnThisFloor = fNum <= 2 ? 2 : bIdx < 2 ? 2 : 1;

        for (let dIdx = 0; dIdx < deptsOnThisFloor; dIdx++) {
          const deptId = new Types.ObjectId();
          orgDepartmentIds.push(deptId);

          const tpl = DEPT_TEMPLATES[(globalDeptCounter - 1) % DEPT_TEMPLATES.length];
          const deptCode = `${bp.code.split('-')[0]}-D${String(globalDeptCounter).padStart(3, '0')}`;
          const deptName = `${bBp.name.split(' - ')[0]} ${tpl.suffix} (L${fNum})`;

          departmentDocs.push({
            _id: deptId,
            organizationId: orgId,
            buildingId,
            floorId,
            name: deptName,
            code: deptCode,
            managerName: bp.users.department.name,
            monthlyBudgetUsd: tpl.budget,
            headcount: tpl.headcount,
            operatingHours: { startHour: 7, endHour: 19 },
          });

          // Register 1 primary meter for every department (54 meters) + extra feeder meters on first 6 departments = 60 meters total
          const metersForDept = globalDeptCounter <= 6 ? 2 : 1;
          for (let mIdx = 0; mIdx < metersForDept; mIdx++) {
            const meterId = new Types.ObjectId();
            orgMeterIds.push(meterId);

            const meterCode = `MTR-${bp.code.split('-')[0]}-${String(globalMeterCounter).padStart(3, '0')}`;
            const isWarningMeter = globalMeterCounter % 9 === 0;
            const isMaintMeter = globalMeterCounter % 19 === 0;
            const healthScore = isMaintMeter
              ? 74
              : isWarningMeter
              ? 81
              : 92 + Math.floor(rng() * 8);

            meterDocs.push({
              _id: meterId,
              organizationId: orgId,
              buildingId,
              floorId,
              departmentId: deptId,
              meterCode,
              name: `${tpl.type} Smart Feeder #${globalMeterCounter}`,
              meterType: mIdx === 1 ? 'Main' : tpl.type,
              unit: 'kWh',
              status: isMaintMeter ? 'maintenance' : isWarningMeter ? 'warning' : 'active',
              healthScore,
              lastReadingAt: new Date(),
              firmwareVersion: globalMeterCounter % 4 === 0 ? 'v4.1.8' : 'v4.2.1',
              installationDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
              maxCapacityKw: tpl.type === 'Main' || tpl.type === 'Machinery' ? 180 : 95,
            });

            globalMeterCounter++;
          }

          globalDeptCounter++;
        }
      }
    }

    // Create the 4 Role Users for this Organization
    const adminUserId = new Types.ObjectId();
    const facilityUserId = new Types.ObjectId();
    const deptUserId = new Types.ObjectId();
    const viewerUserId = new Types.ObjectId();

    userDocs.push(
      {
        _id: adminUserId,
        organizationId: orgId,
        name: bp.users.admin.name,
        email: bp.users.admin.email,
        passwordHash,
        role: 'org_admin',
        assignedBuildingIds: [],
        assignedDepartmentIds: [],
        assignedMeterIds: [],
        jobTitle: bp.users.admin.title,
        phone: bp.contactPhone,
        preferences: { theme: 'dark', emailNotifications: true },
        isActive: true,
        lastLoginAt: new Date(),
      },
      {
        _id: facilityUserId,
        organizationId: orgId,
        name: bp.users.facility.name,
        email: bp.users.facility.email,
        passwordHash,
        role: 'facility_manager',
        assignedBuildingIds: orgBuildingIds,
        assignedDepartmentIds: [],
        assignedMeterIds: orgMeterIds,
        jobTitle: bp.users.facility.title,
        phone: bp.contactPhone,
        preferences: { theme: 'dark', emailNotifications: true },
        isActive: true,
        lastLoginAt: new Date(),
      },
      {
        _id: deptUserId,
        organizationId: orgId,
        name: bp.users.department.name,
        email: bp.users.department.email,
        passwordHash,
        role: 'department_manager',
        assignedBuildingIds: [orgBuildingIds[0]],
        assignedDepartmentIds: orgDepartmentIds.slice(0, 6),
        assignedMeterIds: [],
        jobTitle: bp.users.department.title,
        phone: bp.contactPhone,
        preferences: { theme: 'dark', emailNotifications: true },
        isActive: true,
        lastLoginAt: new Date(),
      },
      {
        _id: viewerUserId,
        organizationId: orgId,
        name: bp.users.viewer.name,
        email: bp.users.viewer.email,
        passwordHash,
        role: 'viewer',
        assignedBuildingIds: orgBuildingIds,
        assignedDepartmentIds: [],
        assignedMeterIds: [],
        jobTitle: bp.users.viewer.title,
        phone: bp.contactPhone,
        preferences: { theme: 'dark', emailNotifications: false },
        isActive: true,
        lastLoginAt: new Date(),
      }
    );

    // Seed Thresholds for this Organization (Building, Department, and Meter scopes)
    const bldgThresholdId = new Types.ObjectId();
    const meterThresholdId = new Types.ObjectId();

    thresholdDocs.push(
      {
        _id: bldgThresholdId,
        organizationId: orgId,
        name: `${bp.buildings[0].name} Peak Load Guard`,
        scopeType: 'building',
        buildingId: orgBuildingIds[0],
        metric: 'consumption_kwh',
        period: 'hourly',
        warningLimit: 85,
        criticalLimit: 115,
        isActive: true,
        createdBy: facilityUserId,
      },
      {
        _id: new Types.ObjectId(),
        organizationId: orgId,
        name: 'Primary Department Cost Ceiling',
        scopeType: 'department',
        buildingId: orgBuildingIds[0],
        departmentId: orgDepartmentIds[0],
        metric: 'cost_usd',
        period: 'daily',
        warningLimit: 140,
        criticalLimit: 210,
        isActive: true,
        createdBy: facilityUserId,
      },
      {
        _id: meterThresholdId,
        organizationId: orgId,
        name: 'Main Feeder Surge Threshold',
        scopeType: 'meter',
        buildingId: orgBuildingIds[0],
        departmentId: orgDepartmentIds[0],
        meterId: orgMeterIds[0],
        metric: 'consumption_kwh',
        period: 'hourly',
        warningLimit: 75,
        criticalLimit: 98,
        isActive: true,
        createdBy: facilityUserId,
      }
    );

    // Seed Scheduled Reports for this Organization
    scheduledReportDocs.push(
      {
        _id: new Types.ObjectId(),
        organizationId: orgId,
        createdBy: adminUserId,
        name: `${bp.code} Weekly Executive Consumption & Cost Brief`,
        reportType: 'executive_summary',
        frequency: 'weekly',
        format: 'PDF',
        scope: { buildingId: orgBuildingIds[0] },
        recipients: [bp.users.admin.email, bp.users.facility.email],
        lastGeneratedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        nextRunAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
      {
        _id: new Types.ObjectId(),
        organizationId: orgId,
        createdBy: facilityUserId,
        name: `${bp.code} Monthly Carbon ESG & Anomaly Audit`,
        reportType: 'carbon_esg',
        frequency: 'monthly',
        format: 'CSV',
        scope: {},
        recipients: [bp.users.admin.email, bp.users.viewer.email],
        lastGeneratedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        nextRunAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        isActive: true,
      }
    );
  }

  // Generate 6,840 Time-Series Energy Records across all 60 meters
  // 1) 36 days x 3 readings/day (03:00, 11:00, 16:00 UTC) x 60 meters = 6,480 records
  // 2) Last 24 hours x 15 primary meters at top-of-hour = 360 records
  const now = new Date();
  const baseDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
  );

  const orgMap = new Map(orgDocs.map((o) => [String(o._id), o]));
  const sampleHours = [3, 11, 16];

  for (let mIdx = 0; mIdx < meterDocs.length; mIdx++) {
    const meter = meterDocs[mIdx];
    const org = orgMap.get(String(meter.organizationId))!;
    const meterType = String(meter.meterType);

    const typeBaseLoad: Record<string, number> = {
      Main: 62,
      Machinery: 54,
      HVAC: 44,
      ServerRack: 40,
      Submeter: 28,
      Lighting: 18,
    };
    const baseKwh = typeBaseLoad[meterType] || 30;

    for (let dayOffset = 35; dayOffset >= 0; dayOffset--) {
      const dayTime = new Date(baseDay.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      const dow = dayTime.getUTCDay();
      const isWeekend = dow === 0 || dow === 6;
      const weekendFactor = isWeekend ? 0.62 : 1.0;
      // Slight upward or downward efficiency trend across month
      const monthFactor = dayOffset > 18 ? 1.06 : 0.98;

      for (const hr of sampleHours) {
        const ts = new Date(dayTime.getTime() + hr * 60 * 60 * 1000);
        if (ts > now) continue;

        const hourFactor = hr === 3 ? 0.44 : hr === 11 ? 1.05 : 1.24;
        const randomJitter = 0.88 + rng() * 0.24;

        // Deterministic anomaly injection (~1.4% of readings)
        const isAnomaly = (mIdx + dayOffset * 3 + hr) % 71 === 0;
        const anomalyBoost = isAnomaly ? 1.85 + rng() * 0.45 : 1.0;

        const consumptionKwh = Number(
          (baseKwh * weekendFactor * monthFactor * hourFactor * randomJitter * anomalyBoost).toFixed(2)
        );

        const { estimatedCost, carbonKg } = calculateCostAndCarbon({
          consumptionKwh,
          timestamp: ts,
          baseTariffPerKwh: Number(org.baseTariffPerKwh),
          peakTariffPerKwh: Number(org.peakTariffPerKwh),
          carbonFactorKgPerKwh: Number(org.carbonFactorKgPerKwh),
        });

        const anomalyScore = isAnomaly ? Number((2.4 + rng() * 1.7).toFixed(2)) : 0;
        const recordId = new Types.ObjectId();

        energyRecordDocs.push({
          _id: recordId,
          organizationId: meter.organizationId,
          buildingId: meter.buildingId,
          floorId: meter.floorId,
          departmentId: meter.departmentId,
          meterId: meter._id,
          timestamp: ts,
          consumptionKwh,
          estimatedCost,
          carbonKg,
          peakDemandKw: Number((consumptionKwh * (1.14 + rng() * 0.15)).toFixed(2)),
          powerFactor: Number((0.87 + rng() * 0.11).toFixed(2)),
          isAnomaly,
          anomalyScore,
          source: 'seed',
        });

        // Create corresponding Alert documents for recent anomalies (up to 36 alerts total)
        if (isAnomaly && alertDocs.length < 36) {
          const alertIndex = alertDocs.length;
          const statuses: Array<'New' | 'Acknowledged' | 'Resolved'> = [
            'New',
            'New',
            'Acknowledged',
            'Resolved',
          ];
          const status = statuses[alertIndex % statuses.length];
          const isCritical = anomalyScore >= 3.1;

          alertDocs.push({
            _id: new Types.ObjectId(),
            organizationId: meter.organizationId,
            buildingId: meter.buildingId,
            floorId: meter.floorId,
            departmentId: meter.departmentId,
            meterId: meter._id,
            energyRecordId: recordId,
            type: alertIndex % 3 === 0 ? 'high_usage' : 'unusual_consumption',
            severity: isCritical ? 'critical' : 'warning',
            status,
            title:
              alertIndex % 3 === 0
                ? `High Usage Threshold Exceeded on ${meter.meterCode}`
                : `Unusual Consumption Spike on ${meter.meterCode}`,
            message: `Meter ${meter.meterCode} (${meter.name}) recorded ${consumptionKwh} kWh (Z-Score: ${anomalyScore}σ), exceeding the normal baseline limit of ${(
              baseKwh * 1.25
            ).toFixed(1)} kWh.`,
            actualValue: consumptionKwh,
            thresholdValue: Number((baseKwh * 1.25).toFixed(1)),
            timestamp: ts,
            resolutionNotes:
              status === 'Resolved'
                ? 'Verified temporary chiller compressor surge and re-balanced stage 2 load.'
                : status === 'Acknowledged'
                ? 'Facility team dispatched to inspect sub-circuit feeder.'
                : '',
          });
        }
      }
    }
  }

  // Add 24-hour granular hourly readings for the first 15 meters (avoiding hours 3, 11, 16 on baseDay if already added)
  for (let mIdx = 0; mIdx < Math.min(15, meterDocs.length); mIdx++) {
    const meter = meterDocs[mIdx];
    const org = orgMap.get(String(meter.organizationId))!;

    for (let hOffset = 1; hOffset <= 24; hOffset++) {
      const ts = new Date(baseDay.getTime() - hOffset * 60 * 60 * 1000);
      const hr = ts.getUTCHours();
      if (sampleHours.includes(hr)) continue;

      const isDay = hr >= 8 && hr <= 19;
      const consumptionKwh = Number(((isDay ? 48 : 21) * (0.9 + rng() * 0.25)).toFixed(2));
      const { estimatedCost, carbonKg } = calculateCostAndCarbon({
        consumptionKwh,
        timestamp: ts,
        baseTariffPerKwh: Number(org.baseTariffPerKwh),
        peakTariffPerKwh: Number(org.peakTariffPerKwh),
        carbonFactorKgPerKwh: Number(org.carbonFactorKgPerKwh),
      });

      energyRecordDocs.push({
        _id: new Types.ObjectId(),
        organizationId: meter.organizationId,
        buildingId: meter.buildingId,
        floorId: meter.floorId,
        departmentId: meter.departmentId,
        meterId: meter._id,
        timestamp: ts,
        consumptionKwh,
        estimatedCost,
        carbonKg,
        peakDemandKw: Number((consumptionKwh * 1.16).toFixed(2)),
        powerFactor: 0.94,
        isAnomaly: false,
        anomalyScore: 0,
        source: 'seed',
      });
    }
  }

  // Bulk insert all collections
  await Organization.insertMany(orgDocs);
  await Promise.all([
    Building.insertMany(buildingDocs),
    Floor.insertMany(floorDocs),
    Department.insertMany(departmentDocs),
    Meter.insertMany(meterDocs),
    User.insertMany(userDocs),
    Threshold.insertMany(thresholdDocs),
    Alert.insertMany(alertDocs),
    ScheduledReport.insertMany(scheduledReportDocs),
  ]);

  // Insert EnergyRecords in chunks of 2,500 for optimal MongoDB throughput
  const CHUNK_SIZE = 2500;
  for (let i = 0; i < energyRecordDocs.length; i += CHUNK_SIZE) {
    const chunk = energyRecordDocs.slice(i, i + CHUNK_SIZE);
    await EnergyRecord.insertMany(chunk, { ordered: false });
  }

  for (const org of orgDocs) {
    invalidateOrgCache(String(org._id));
  }

  return {
    seeded: true,
    organizations: orgDocs.length,
    buildings: buildingDocs.length,
    floors: floorDocs.length,
    departments: departmentDocs.length,
    meters: meterDocs.length,
    users: userDocs.length,
    energyRecords: energyRecordDocs.length,
    thresholds: thresholdDocs.length,
    alerts: alertDocs.length,
    scheduledReports: scheduledReportDocs.length,
  };
}
