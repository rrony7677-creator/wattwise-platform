export type UserRole = 'org_admin' | 'facility_manager' | 'department_manager' | 'viewer';
export type MeterStatus = 'active' | 'warning' | 'offline' | 'maintenance';
export type MeterType = 'Main' | 'Submeter' | 'HVAC' | 'Lighting' | 'Machinery' | 'ServerRack';
export type AlertStatus = 'New' | 'Acknowledged' | 'Resolved';
export type AlertType = 'high_usage' | 'unusual_consumption' | 'meter_health' | 'budget_warning';
export type AlertSeverity = 'warning' | 'critical';
export type IndustryType = 'Commercial' | 'Manufacturing' | 'University' | 'Healthcare' | 'Technology';
export type BuildingType = 'Office' | 'Factory' | 'Academic' | 'DataCenter' | 'Warehouse';

export interface Organization {
  _id: string;
  name: string;
  code: string;
  industry: IndustryType;
  address: string;
  contactEmail: string;
  contactPhone: string;
  currency: string;
  baseTariffPerKwh: number;
  peakTariffPerKwh: number;
  carbonFactorKgPerKwh: number;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  organizationId: string;
  name: string;
  email: string;
  role: UserRole;
  assignedBuildingIds: string[];
  assignedDepartmentIds: string[];
  assignedMeterIds: string[];
  jobTitle?: string;
  phone?: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    emailNotifications: boolean;
  };
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface DemoAccount {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  organizationName: string;
  organizationCode: string;
  scopeDescription: string;
}

export interface Building {
  _id: string;
  organizationId: string;
  name: string;
  code: string;
  address: string;
  buildingType: BuildingType;
  totalFloors: number;
  areaSqFt: number;
  baselineDailyKwh: number;
  isActive: boolean;
  floorCount?: number;
  departmentCount?: number;
  meterCount?: number;
  totalConsumptionKwh?: number;
  totalCostUsd?: number;
  createdAt: string;
}

export interface Floor {
  _id: string;
  organizationId: string;
  buildingId: string | { _id: string; name: string; code: string };
  floorNumber: number;
  name: string;
  areaSqFt: number;
  departmentCount?: number;
  meterCount?: number;
  createdAt: string;
}

export interface Department {
  _id: string;
  organizationId: string;
  buildingId: string | { _id: string; name: string; code: string };
  floorId: string | { _id: string; floorNumber: number; name: string };
  name: string;
  code: string;
  managerName?: string;
  monthlyBudgetUsd: number;
  headcount: number;
  operatingHours: {
    startHour: number;
    endHour: number;
  };
  totalConsumptionKwh?: number;
  totalCostUsd?: number;
  meterCount?: number;
  createdAt: string;
}

export interface Meter {
  _id: string;
  organizationId: string;
  buildingId: string | { _id: string; name: string; code: string };
  floorId: string | { _id: string; floorNumber: number; name: string };
  departmentId: string | { _id: string; name: string; code: string };
  meterCode: string;
  name: string;
  meterType: MeterType;
  unit: 'kWh';
  status: MeterStatus;
  healthScore: number;
  lastReadingAt?: string;
  firmwareVersion: string;
  installationDate: string;
  maxCapacityKw: number;
  recentConsumptionKwh?: number;
  createdAt: string;
}

export interface EnergyRecord {
  _id: string;
  organizationId: string;
  buildingId: string | { _id: string; name: string; code: string };
  floorId: string | { _id: string; floorNumber: number; name: string };
  departmentId: string | { _id: string; name: string; code: string };
  meterId: string | { _id: string; meterCode: string; name: string; meterType?: MeterType };
  timestamp: string;
  consumptionKwh: number;
  estimatedCost: number;
  carbonKg: number;
  peakDemandKw: number;
  powerFactor: number;
  isAnomaly: boolean;
  anomalyScore: number;
  source: 'seed' | 'manual' | 'iot_simulator';
  createdAt: string;
}

export interface Threshold {
  _id: string;
  organizationId: string;
  name: string;
  scopeType: 'building' | 'department' | 'meter';
  buildingId?: string | { _id: string; name: string; code: string };
  departmentId?: string | { _id: string; name: string; code: string };
  meterId?: string | { _id: string; meterCode: string; name: string };
  metric: 'consumption_kwh' | 'cost_usd' | 'unusual_spike_pct';
  period: 'hourly' | 'daily' | 'monthly';
  warningLimit: number;
  criticalLimit: number;
  isActive: boolean;
  createdAt: string;
}

export interface AlertItem {
  _id: string;
  organizationId: string;
  buildingId: string | { _id: string; name: string; code: string };
  floorId?: string | { _id: string; floorNumber: number; name: string };
  departmentId?: string | { _id: string; name: string; code: string };
  meterId?: string | { _id: string; meterCode: string; name: string };
  thresholdId?: string;
  energyRecordId?: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  actualValue: number;
  thresholdValue: number;
  timestamp: string;
  acknowledgedBy?: string | { _id: string; name: string };
  acknowledgedAt?: string;
  resolvedBy?: string | { _id: string; name: string };
  resolvedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
}

export interface ScheduledReport {
  _id: string;
  organizationId: string;
  name: string;
  reportType: 'executive_summary' | 'building_breakdown' | 'department_cost' | 'anomaly_audit' | 'carbon_esg';
  frequency: 'daily' | 'weekly' | 'monthly';
  format: 'CSV' | 'PDF';
  scope: {
    buildingId?: string | { _id: string; name: string };
    departmentId?: string | { _id: string; name: string };
  };
  recipients: string[];
  lastGeneratedAt?: string;
  nextRunAt: string;
  isActive: boolean;
  createdAt: string;
}

export interface DashboardOverviewData {
  totalConsumptionKwh: number;
  totalCostUsd: number;
  totalCarbonKg: number;
  averageDailyUsageKwh: number;
  peakConsumptionKwh: number;
  lowestConsumptionKwh: number;
  recordsCount: number;
  previousPeriodComparison: {
    previousTotalKwh: number;
    previousTotalCostUsd: number;
    consumptionDeltaPct: number;
    costDeltaPct: number;
  };
  buildingWiseConsumption: Array<{
    buildingId: string;
    name: string;
    code: string;
    kwh: number;
    cost: number;
    carbonKg: number;
    percentage: number;
  }>;
  departmentWiseConsumption: Array<{
    departmentId: string;
    name: string;
    code: string;
    buildingName: string;
    kwh: number;
    cost: number;
    budgetUsd: number;
    percentage: number;
  }>;
  meterWiseConsumption: Array<{
    meterId: string;
    meterCode: string;
    name: string;
    meterType: MeterType;
    status: MeterStatus;
    healthScore: number;
    kwh: number;
    cost: number;
  }>;
  activeAlertsCount: {
    new: number;
    acknowledged: number;
    resolved: number;
    critical: number;
  };
}

export interface TimeSeriesPoint {
  label: string;
  timestamp: string;
  kwh: number;
  cost: number;
  carbonKg: number;
  peakKw: number;
  avgKwh: number;
  anomalyCount: number;
}

export interface EnergyRecommendation {
  id: string;
  title: string;
  category: 'Baseload Waste' | 'Peak Shifting' | 'Power Factor' | 'HVAC Optimization' | 'Department Efficiency';
  severity: 'high' | 'medium' | 'low';
  targetEntityName: string;
  description: string;
  estimatedMonthlySavingsKwh: number;
  estimatedMonthlySavingsUsd: number;
  estimatedCarbonReductionKg: number;
}

export interface ForecastPoint {
  date: string;
  label: string;
  actualKwh?: number;
  forecastKwh: number;
  lowerBoundKwh: number;
  upperBoundKwh: number;
  estimatedCost: number;
  isForecast: boolean;
}

export interface InsightsData {
  unusualConsumptionEvents: Array<{
    recordId: string;
    timestamp: string;
    meterCode: string;
    meterName: string;
    buildingName: string;
    departmentName: string;
    consumptionKwh: number;
    estimatedCost: number;
    anomalyScore: number;
  }>;
  highestUsageEntities: {
    peakBuilding: { name: string; kwh: number; cost: number } | null;
    peakDepartment: { name: string; kwh: number; cost: number } | null;
    peakMeter: { meterCode: string; name: string; kwh: number } | null;
    peakHourOfDay: { hour: number; label: string; avgKwh: number };
  };
  energySavingRecommendations: EnergyRecommendation[];
  forecast: ForecastPoint[];
  carbonMetrics: {
    totalCarbonKg: number;
    totalCarbonTons: number;
    treesEquivalent: number;
    emissionIntensityKgPerSqFt: number;
    totalPotentialSavingsKwh: number;
    totalPotentialSavingsUsd: number;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  cached?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
