export interface AnalyticsOptions {
  periods: string[];
  groupBy: string[];
  metrics: string[];
  defaults: {
    platformFeeRate: number;
  };
}

export interface AnalyticsWindow {
  period?: string;
  from?: string;
  to?: string;
}

export interface RideSummary {
  totalRides: number;
  confirmedRides: number;
  cancelledRides: number;
  driverSelectedRides?: number;
  averageFare: number;
  totalFare: number;
  averageDistanceKm?: number;
  averageDurationMinutes?: number;
}

export interface RevenueSummary {
  totalPayments: number;
  succeededPayments: number;
  failedPayments: number;
  refundRequestedPayments?: number;
  refundedPayments?: number;
  grossRevenue: number;
  fareRevenue?: number;
  tipAmount?: number;
  discountAmount?: number;
  refundAmount: number;
  netRevenue: number;
}

export interface DriverSummary {
  totalDrivers: number;
  approvedDrivers?: number;
  pendingDrivers: number;
  underReviewDrivers?: number;
  onlineDrivers: number;
  offlineDrivers?: number;
}

export interface DisputeSummary {
  totalDisputes: number;
  openDisputes: number;
  resolvedDisputes?: number;
  rejectedDisputes?: number;
  urgentDisputes: number;
  requestedRefundAmount?: number;
}

export interface RatingSummary {
  totalRatings: number;
  averageScore: number;
  positiveRatings?: number;
  negativeRatings: number;
}

export interface TrustSafetySummary {
  trustProfiles: number;
  highRiskTrustProfiles: number;
  openTrustReviews: number;
  fraudCases?: number;
  openFraudCases: number;
  criticalFraudCases: number;
}

export interface AnalyticsOverview {
  window: AnalyticsWindow;
  summary: {
    rides: RideSummary;
    revenue: RevenueSummary;
    disputes: DisputeSummary;
    ratings: RatingSummary;
    drivers: DriverSummary;
    trustSafety: TrustSafetySummary;
  };
  highlights: {
    rideVolume: number;
    netRevenue: number;
    averageRating: number;
    openDisputes: number;
    onlineDrivers: number;
    highRiskTrustProfiles: number;
    openFraudCases: number;
  };
}

export interface AnalyticsBreakdownPoint {
  key?: string;
  bucket?: string;
  totalRides?: number;
  totalPayments?: number;
  totalDrivers?: number;
  averageFare?: number;
  totalFare?: number;
  grossRevenue?: number;
  netRevenue?: number;
  openDisputes?: number;
  averageScore?: number;
}

export interface RideAnalytics {
  window: AnalyticsWindow;
  groupBy: string;
  summary: RideSummary;
  series: AnalyticsBreakdownPoint[];
  byVehicleType: AnalyticsBreakdownPoint[];
  byStatus: AnalyticsBreakdownPoint[];
}

export interface RevenueAnalytics {
  window: AnalyticsWindow;
  groupBy: string;
  summary: RevenueSummary;
  series: AnalyticsBreakdownPoint[];
  byMethod: AnalyticsBreakdownPoint[];
  byStatus: AnalyticsBreakdownPoint[];
}

export interface DriverAnalytics {
  window: AnalyticsWindow;
  summary: DriverSummary;
  topDrivers: Array<{
    driverId: string;
    fullName: string | null;
    rideCount: number;
    totalFare: number;
    averageFare: number;
  }>;
  supplyByApprovalStatus: AnalyticsBreakdownPoint[];
  supplyByZone: AnalyticsBreakdownPoint[];
}

export interface TrustSafetyAnalytics {
  window: AnalyticsWindow;
  summary: {
    disputes: DisputeSummary;
    ratings: RatingSummary;
    trust: {
      totalProfiles: number;
      highRiskProfiles: number;
      openReviews: number;
      averageScore: number;
    };
    fraud: {
      totalCases: number;
      openCases: number;
      criticalCases: number;
      averageRiskScore: number;
    };
  };
  highRiskTrustProfiles: Array<{
    id: string;
    subjectType: string | null;
    subjectId: string | null;
    riskLevel: string | null;
    reviewStatus: string | null;
    overallScore: number;
  }>;
  openFraudCases: Array<{
    id: string;
    caseCode: string | null;
    caseType: string | null;
    severity: string | null;
    status: string | null;
    riskScore: number;
  }>;
  urgentDisputes: Array<{
    id: string;
    disputeCode: string | null;
    type: string | null;
    status: string | null;
    priority: string | null;
    requestedRefundAmount: number | null;
  }>;
}

export interface AnalyticsForecast {
  input: ForecastPayload;
  forecast: Array<{
    day: number;
    rides: number;
    grossRevenue: number;
    platformRevenue: number;
    driverPayout: number;
  }>;
  summary: {
    projectedRides: number;
    projectedGrossRevenue: number;
    projectedPlatformRevenue: number;
    projectedDriverPayout: number;
  };
}

export interface AnalyticsFilters {
  period: string;
  groupBy: string;
  limit: string;
}

export interface ForecastPayload {
  baselineRides: number;
  averageFare: number;
  growthRate: number;
  platformFeeRate: number;
  forecastDays: number;
}

export interface ForecastFormState {
  baselineRides: string;
  averageFare: string;
  growthRate: string;
  platformFeeRate: string;
  forecastDays: string;
}

export interface AnalyticsLoadResult {
  options: AnalyticsOptions | null;
  overview: AnalyticsOverview | null;
  rides: RideAnalytics | null;
  revenue: RevenueAnalytics | null;
  drivers: DriverAnalytics | null;
  trustSafety: TrustSafetyAnalytics | null;
  alerts: string[];
}
