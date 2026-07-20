export interface AnalyticsWindow {
  period: string;
  from: string | Date;
  to: string | Date;
}

export interface AnalyticsOptions {
  periods: string[];
  groupBy: string[];
  metrics: string[];
  defaults: {
    platformFeeRate: number;
  };
}

export interface RideSummary {
  totalRides: number;
  confirmedRides: number;
  cancelledRides: number;
  driverSelectedRides: number;
  averageFare: number;
  totalFare: number;
  averageDistanceKm: number;
  averageDurationMinutes: number;
}

export interface RevenueSummary {
  totalPayments: number;
  succeededPayments: number;
  failedPayments: number;
  refundRequestedPayments: number;
  refundedPayments: number;
  grossRevenue: number;
  fareRevenue: number;
  tipAmount: number;
  discountAmount: number;
  refundAmount: number;
  netRevenue: number;
}

export interface DisputeSummary {
  totalDisputes: number;
  openDisputes: number;
  resolvedDisputes: number;
  rejectedDisputes: number;
  urgentDisputes: number;
  requestedRefundAmount: number;
}

export interface RatingSummary {
  totalRatings: number;
  averageScore: number;
  positiveRatings: number;
  negativeRatings: number;
}

export interface DriverSummary {
  totalDrivers: number;
  approvedDrivers: number;
  pendingDrivers: number;
  underReviewDrivers: number;
  onlineDrivers: number;
  offlineDrivers: number;
}

export interface OverviewTrustSafetySummary {
  trustProfiles: number;
  highRiskTrustProfiles: number;
  openTrustReviews: number;
  fraudCases: number;
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
    trustSafety: OverviewTrustSafetySummary;
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

export interface RideSeriesItem extends RideSummary {
  bucket?: string;
  key?: string;
}

export interface RevenueSeriesItem extends RevenueSummary {
  bucket?: string;
  key?: string;
}

export interface RideAnalytics {
  window: AnalyticsWindow;
  groupBy: string;
  summary: RideSummary;
  series: RideSeriesItem[];
  byVehicleType: RideSeriesItem[];
  byStatus: RideSeriesItem[];
}

export interface RevenueAnalytics {
  window: AnalyticsWindow;
  groupBy: string;
  summary: RevenueSummary;
  series: RevenueSeriesItem[];
  byMethod: RevenueSeriesItem[];
  byStatus: RevenueSeriesItem[];
}

export interface TopDriver {
  driverId: string;
  fullName: string | null;
  rideCount: number;
  totalFare: number;
  averageFare: number;
}

export interface DriverAnalyticsBucket extends DriverSummary {
  key: string;
}

export interface DriverAnalytics {
  window: AnalyticsWindow;
  summary: DriverSummary;
  topDrivers: TopDriver[];
  supplyByApprovalStatus: DriverAnalyticsBucket[];
  supplyByZone: DriverAnalyticsBucket[];
}

export interface TrustSummary {
  totalProfiles: number;
  highRiskProfiles: number;
  openReviews: number;
  averageScore: number;
}

export interface FraudSummary {
  totalCases: number;
  openCases: number;
  criticalCases: number;
  averageRiskScore: number;
}

export interface TrustProfileRiskItem {
  id: string;
  subjectType: string | null;
  subjectId: string | null;
  riskLevel: string | null;
  reviewStatus: string | null;
  overallScore: number;
}

export interface FraudRiskItem {
  id: string;
  caseCode: string | null;
  caseType: string | null;
  severity: string | null;
  status: string | null;
  riskScore: number;
}

export interface DisputeRiskItem {
  id: string;
  disputeCode: string | null;
  type: string | null;
  status: string | null;
  priority: string | null;
  requestedRefundAmount: number | null;
}

export interface TrustSafetyAnalytics {
  window: AnalyticsWindow;
  summary: {
    disputes: DisputeSummary;
    ratings: RatingSummary;
    trust: TrustSummary;
    fraud: FraudSummary;
  };
  highRiskTrustProfiles: TrustProfileRiskItem[];
  openFraudCases: FraudRiskItem[];
  urgentDisputes: DisputeRiskItem[];
}

export interface ForecastDay {
  day: number;
  rides: number;
  grossRevenue: number;
  platformRevenue: number;
  driverPayout: number;
}

export interface AnalyticsForecast {
  input: {
    baselineRides: number;
    averageFare: number;
    growthRate: number;
    platformFeeRate: number;
    forecastDays: number;
  };
  forecast: ForecastDay[];
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
  from: string;
  to: string;
  limit: string;
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
