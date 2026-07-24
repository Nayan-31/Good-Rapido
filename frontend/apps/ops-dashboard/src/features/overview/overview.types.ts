export interface AdminDashboardSummary {
  totalUsers: number;
  activeCount: number;
  pendingCount: number;
  blockedCount: number;
  suspendedCount: number;
  driverCount: number;
  adminCount: number;
  opsCount: number;
}

export interface AdminDashboard {
  summary: AdminDashboardSummary;
  modules: string[];
  recentUsers: Array<{
    id: string;
    role: string | null;
    fullName: string | null;
    email: string | null;
    accountStatus: string | null;
    lastLoginAt: string | null;
  }>;
}

export interface AnalyticsOverview {
  window: {
    period?: string;
    from?: string;
    to?: string;
  };
  summary: {
    rides: {
      totalRides: number;
      confirmedRides: number;
      cancelledRides: number;
      averageFare: number;
      totalFare: number;
    };
    revenue: {
      totalPayments: number;
      netRevenue: number;
      grossRevenue: number;
      refundAmount: number;
    };
    disputes: {
      totalDisputes: number;
      openDisputes: number;
      urgentDisputes: number;
    };
    ratings: {
      totalRatings: number;
      averageScore: number;
      negativeRatings: number;
    };
    drivers: {
      totalDrivers: number;
      onlineDrivers: number;
      pendingDrivers: number;
    };
    trustSafety: {
      trustProfiles: number;
      highRiskTrustProfiles: number;
      openTrustReviews: number;
      openFraudCases: number;
      criticalFraudCases: number;
    };
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

export interface RideOpsDashboardSummary {
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

export interface RideOpsDashboard {
  summary: RideOpsDashboardSummary;
  queue: Array<{
    id: string;
    bookingCode: string;
    lifecycleStatus: string;
    guidance?: {
      nextAction?: string;
    };
    ops?: {
      priority?: string;
      issueStatus?: string;
    };
  }>;
}

export interface OverviewLoadResult {
  adminDashboard: AdminDashboard | null;
  analyticsOverview: AnalyticsOverview | null;
  rideOpsDashboard: RideOpsDashboard | null;
  alerts: string[];
}
