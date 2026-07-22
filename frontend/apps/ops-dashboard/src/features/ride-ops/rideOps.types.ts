export interface RideOpsSummary {
  totalRides: number;
  pendingConfirmation: number;
  activeRides: number;
  completedRides: number;
  cancelledRides: number;
  highRiskRides: number;
  escalatedRides: number;
  urgentRides: number;
  averageFare: number;
}

export interface RideOpsLocation {
  address: string | null;
  latitude: number;
  longitude: number;
}

export interface RideOpsDriver {
  driverId: string | null;
  fullName: string | null;
  rating: number;
  vehicleName: string | null;
  vehicleNumber: string | null;
  vehicleColor: string | null;
  etaMinutes: number;
  distanceKm: number;
}

export interface RideOpsFare {
  currency: string;
  totalFare: number;
  distanceKm: number;
  durationMinutes: number;
  surgeMultiplier?: number;
  confidenceScore?: number;
  validUntil?: string | null;
  lockedUntil?: string | null;
}

export interface RideOpsRisk {
  cancellationRiskScore: number;
  cancellationRiskLevel: string | null;
  routeAccuracyScore: number;
  fairPriceScore: number;
  needsAttention: boolean;
}

export interface RideOpsTrustSignals {
  driverTrustScore: number;
  driverReliabilityScore: number;
  routeFairnessScore: number;
  routeAccuracyScore: number;
  cancellationRiskScore: number;
  cancellationRiskLevel: string | null;
  cancellationRatio: number;
  detourPercentage: number;
  onTimeArrivalScore: number;
  fairPriceScore: number;
}

export interface RideOpsTimeline {
  bookedAt: string | null;
  confirmedAt: string | null;
  driverArrivalEtaAt: string | null;
  driverArrivedAt: string | null;
  rideStartedAt: string | null;
  estimatedDropoffAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
}

export interface RideOpsActionLogItem {
  action: string | null;
  note: string | null;
  actorId: string | null;
  actorRole: string | null;
  createdAt: string | null;
}

export interface RideOpsState {
  priority: string;
  issueStatus: string;
  assignedOpsUserId: string | null;
  lastAction: string | null;
  lastActionNote: string | null;
  lastActionAt: string | null;
  lastActionBy: string | null;
  actionLog?: RideOpsActionLogItem[];
}

export interface RideOpsGuidance {
  canConfirm: boolean;
  canCancel: boolean;
  canReassignDriver: boolean;
  needsAttention: boolean;
  nextAction: string;
}

export interface RideOpsQueueItem {
  id: string;
  bookingCode: string;
  bookingStatus: string;
  lifecycleStatus: string;
  pickup: RideOpsLocation;
  dropoff: RideOpsLocation;
  vehicleType: string;
  driver: RideOpsDriver;
  fare: RideOpsFare;
  risk: RideOpsRisk;
  ops: RideOpsState;
  timeline: RideOpsTimeline;
  guidance: RideOpsGuidance;
  createdAt: string;
  updatedAt: string;
  trustSignals?: RideOpsTrustSignals;
  paymentMethod?: string | null;
  riderNote?: string | null;
  cancellation?: unknown;
}

export interface RideOpsDashboard {
  summary: RideOpsSummary;
  queue: RideOpsQueueItem[];
}

export interface RideOpsQueue {
  summary: Pick<RideOpsSummary, "totalRides" | "activeRides" | "highRiskRides" | "escalatedRides" | "urgentRides">;
  rides: RideOpsQueueItem[];
}

export interface RideOpsOptions {
  filters: string[];
  bookingStatuses: string[];
  lifecycleStatuses: string[];
  vehicleTypes: string[];
  cancellationReasons: string[];
  riskLevels: string[];
  priorityLevels: string[];
  issueStatuses: string[];
  actions: string[];
}

export interface RideOpsFilters {
  status: string;
  priority: string;
  issueStatus: string;
  query: string;
}
