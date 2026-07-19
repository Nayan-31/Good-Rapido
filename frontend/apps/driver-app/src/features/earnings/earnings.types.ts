export interface DriverEarningsSummary {
  todayEarnings: number;
  weeklyEarnings: number;
  rideCount: number;
  availableForPayout: number;
  pendingEarnings: number;
  grossFare: number;
  driverFare: number;
  incentiveAmount: number;
  tipAmount: number;
  penaltyAmount: number;
  platformFee: number;
  averageNetPerRide: number;
  payoutStatus: string;
  nextAction: string;
}

export interface DriverRideEarning {
  rideId: string;
  bookingCode: string;
  route: string;
  completedAt: string;
  grossFare: number;
  driverFare: number;
  incentiveAmount: number;
  tipAmount: number;
  deductionAmount: number;
  netEarning: number;
  paymentStatus: string;
  guidance: string;
}

export interface DriverWeeklyStatement {
  statementId: string;
  period: string;
  rideCount: number;
  netEarnings: number;
  availableForPayout: number;
  status: string;
}

export interface DriverEarningsView {
  summary: DriverEarningsSummary;
  rides: DriverRideEarning[];
  statements: DriverWeeklyStatement[];
  backendNote: string | null;
}
