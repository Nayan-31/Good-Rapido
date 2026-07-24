export interface PricingOptions {
  vehicleTypes: string[];
  statuses: string[];
  currency: string;
  defaultServiceZone: string;
  baselineRules: Array<Record<string, unknown>>;
}

export interface PricingSummary {
  totalRules: number;
  draftRules: number;
  activeRules: number;
  archivedRules: number;
  vehicleTypesCovered: string[];
  serviceZonesCovered: string[];
}

export interface PricingGuidance {
  canEdit: boolean;
  canActivate: boolean;
  canArchive: boolean;
  nextAction: string;
}

export interface PricingRuleListItem {
  id: string;
  ruleCode: string | null;
  label: string | null;
  vehicleType: string | null;
  serviceZone: string;
  status: string;
  baseFare: number;
  perKm: number;
  perMinute: number;
  minimumFare: number;
  platformFee: number;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  activatedAt: string | null;
  archivedAt: string | null;
  updatedAt: string | null;
  guidance: PricingGuidance;
}

export interface PricingRule extends PricingRuleListItem {
  description: string | null;
  pricing: {
    currency: string;
    baseFare: number;
    perKm: number;
    perMinute: number;
    minimumFare: number;
    platformFee: number;
    taxRate: number;
    averageSpeedKmph: number;
  };
  surgeRules: {
    morningPeakMultiplier: number;
    eveningPeakMultiplier: number;
    lateNightMultiplier: number;
    maxSurgeMultiplier: number;
  };
  notes: string | null;
  createdAt: string | null;
}

export interface PricingDashboard {
  summary: PricingSummary;
  activeRules: PricingRuleListItem[];
  recentRules: PricingRuleListItem[];
}

export interface PricingRuleList {
  rules: PricingRuleListItem[];
  summary: PricingSummary;
}

export interface PricingSimulation {
  rule: PricingRuleListItem;
  simulation: {
    currency: string;
    distanceKm: number;
    durationMinutes: number;
    surge: {
      level?: string;
      multiplier?: number;
    };
    breakdown: Record<string, number | string>;
    estimatedTotal: number;
    guidance: Record<string, unknown>;
  };
}

export interface SurgeOptions {
  statuses: string[];
  triggers: string[];
  decisionTypes: string[];
  levels: string[];
  vehicleTypes: string[];
  defaultServiceZone: string;
  defaultMaxMultiplier: number;
  defaultCooldownMinutes: number;
}

export interface SurgeSummary {
  totalRules: number;
  draftRules: number;
  scheduledRules: number;
  activeRules: number;
  pausedRules: number;
  endedRules: number;
  archivedRules: number;
  highSurgeRules: number;
  maxMultiplier: number;
  serviceZonesCovered: string[];
}

export interface SurgeGuidance {
  canEdit: boolean;
  canActivate: boolean;
  canPause: boolean;
  canEnd: boolean;
  canArchive: boolean;
  nextAction: string;
}

export interface SurgeRuleListItem {
  id: string;
  surgeCode: string | null;
  label: string | null;
  serviceZone: string;
  vehicleTypes: string[];
  trigger: string | null;
  decisionType: string;
  currentMultiplier: number;
  maxMultiplier: number;
  level: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  reason: string | null;
  updatedAt: string | null;
  guidance: SurgeGuidance;
}

export interface SurgeRule extends SurgeRuleListItem {
  description: string | null;
  baseMultiplier: number;
  cooldownMinutes: number;
  customerMessage: string | null;
  signals: {
    demandScore: number;
    supplyScore: number;
    cancellationRiskScore: number;
    activeDrivers: number;
    pendingRequests: number;
  };
  notes: string | null;
  createdAt: string | null;
}

export interface SurgeDashboard {
  summary: SurgeSummary;
  activeRules: SurgeRuleListItem[];
  upcomingRules: SurgeRuleListItem[];
  recentRules: SurgeRuleListItem[];
}

export interface SurgeRuleList {
  rules: SurgeRuleListItem[];
  summary: SurgeSummary;
}

export interface SurgeSimulation {
  rule: SurgeRuleListItem;
  simulation: {
    requestedAt: string;
    serviceZone: string;
    vehicleType: string;
    multiplier: number;
    level: string;
    fareImpact: {
      baseFare: number;
      addedFare: number;
      estimatedFare: number;
    };
    applied: boolean;
    guidance: {
      withinWindow: boolean;
      cappedByMaxMultiplier: boolean;
      nextAction: string;
    };
  };
}

export interface PricingRuleForm {
  label: string;
  vehicleType: string;
  serviceZone: string;
  baseFare: string;
  perKm: string;
  perMinute: string;
  minimumFare: string;
  platformFee: string;
  taxRate: string;
  averageSpeedKmph: string;
}

export interface SurgeRuleForm {
  label: string;
  serviceZone: string;
  vehicleType: string;
  trigger: string;
  baseMultiplier: string;
  maxMultiplier: string;
  demandScore: string;
  supplyScore: string;
}

export interface PricingSimulationForm {
  vehicleType: string;
  serviceZone: string;
  distanceKm: string;
  durationMinutes: string;
  baseFare: string;
  demandScore: string;
  supplyScore: string;
}
