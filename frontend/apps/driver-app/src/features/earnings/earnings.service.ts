import { ApiClientError, type ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type { DriverEarningsView, DriverRideEarning, DriverWeeklyStatement } from "./earnings.types";

type EarningsSummaryResponse = ApiResponse<{
  earnings?: {
    summary?: Partial<DriverEarningsView["summary"]> & {
      netEarnings?: number;
      deductionAmount?: number;
      completedRides?: number;
    };
    recentRides?: BackendEarningRide[];
    guidance?: {
      nextAction?: string | null;
    };
  };
}>;

type EarningsRidesResponse = ApiResponse<{
  earnings?: {
    rides?: BackendEarningRide[];
  };
}>;

type EarningsStatementsResponse = ApiResponse<{
  earnings?: {
    statements?: Array<{
      statementId?: string;
      period?: string;
      rideCount?: number;
      summary?: {
        netEarnings?: number;
        availableForPayout?: number;
      };
      status?: string;
    }>;
    summary?: {
      netEarnings?: number;
    };
  };
}>;

interface BackendEarningRide {
  rideId?: string;
  bookingCode?: string | null;
  vehicleType?: string | null;
  completedAt?: string | null;
  grossFare?: number;
  driverFare?: number;
  incentiveAmount?: number;
  tipAmount?: number;
  deductionAmount?: number;
  netEarning?: number;
  paymentStatus?: string | null;
  guidance?: string | null;
}

interface BackendEarningStatement {
  statementId?: string;
  period?: string;
  rideCount?: number;
  summary?: {
    netEarnings?: number;
    availableForPayout?: number;
  };
  status?: string;
}

export const emptyEarningsView: DriverEarningsView = {
  summary: {
    todayEarnings: 0,
    weeklyEarnings: 0,
    rideCount: 0,
    availableForPayout: 0,
    pendingEarnings: 0,
    grossFare: 0,
    driverFare: 0,
    incentiveAmount: 0,
    tipAmount: 0,
    penaltyAmount: 0,
    platformFee: 0,
    averageNetPerRide: 0,
    payoutStatus: "not_started",
    nextAction: "Complete rides to build earnings and payout history."
  },
  rides: [],
  statements: [],
  backendNote: null
};

export const demoEarningsView: DriverEarningsView = {
  summary: {
    todayEarnings: 2840,
    weeklyEarnings: 16480,
    rideCount: 8,
    availableForPayout: 2420,
    pendingEarnings: 420,
    grossFare: 3460,
    driverFare: 2650,
    incentiveAmount: 320,
    tipAmount: 84,
    penaltyAmount: 36,
    platformFee: 498,
    averageNetPerRide: 355,
    payoutStatus: "available",
    nextAction: "Payout will settle tonight after pending payment capture."
  },
  rides: [
    {
      rideId: "ride-earn-001",
      bookingCode: "GRD-1832",
      route: "Salt Lake Sector V to Howrah Station",
      completedAt: "Today, 08:35 AM",
      grossFare: 420,
      driverFare: 328,
      incentiveAmount: 42,
      tipAmount: 20,
      deductionAmount: 0,
      netEarning: 390,
      paymentStatus: "settled",
      guidance: "Included in next payout"
    },
    {
      rideId: "ride-earn-002",
      bookingCode: "GRD-1944",
      route: "New Town to Park Street",
      completedAt: "Today, 10:10 AM",
      grossFare: 365,
      driverFare: 286,
      incentiveAmount: 36,
      tipAmount: 0,
      deductionAmount: 12,
      netEarning: 310,
      paymentStatus: "available",
      guidance: "Small parking deduction applied"
    },
    {
      rideId: "ride-earn-003",
      bookingCode: "GRD-2015",
      route: "Airport Gate 1 to City Centre",
      completedAt: "Today, 01:25 PM",
      grossFare: 580,
      driverFare: 456,
      incentiveAmount: 68,
      tipAmount: 30,
      deductionAmount: 0,
      netEarning: 554,
      paymentStatus: "pending",
      guidance: "Pending payment capture"
    }
  ],
  statements: [
    {
      statementId: "stmt-week-current",
      period: "This week",
      rideCount: 42,
      netEarnings: 16480,
      availableForPayout: 14860,
      status: "available"
    },
    {
      statementId: "stmt-week-prev",
      period: "Last week",
      rideCount: 39,
      netEarnings: 15220,
      availableForPayout: 15220,
      status: "settled"
    }
  ],
  backendNote: null
};

export const driverEarningsService = {
  async loadEarnings(): Promise<DriverEarningsView> {
    const notes: string[] = [];
    let view = emptyEarningsView;

    try {
      const [todayResponse, weekResponse, ridesResponse, statementsResponse] = await Promise.all([
        apiClient.private.earnings.getSummary({ period: "today" }) as Promise<EarningsSummaryResponse>,
        apiClient.private.earnings.getSummary({ period: "this_week" }) as Promise<EarningsSummaryResponse>,
        apiClient.private.earnings.listRides({ period: "today", limit: 8 }) as Promise<EarningsRidesResponse>,
        apiClient.private.earnings.getStatements({ period: "this_week", groupBy: "weekly", limit: 4 }) as Promise<EarningsStatementsResponse>
      ]);

      view = mapEarningsResponses(todayResponse, weekResponse, ridesResponse, statementsResponse);
    } catch (error) {
      notes.push(resolveBackendNote(error, "Earnings API is wired, but the driver earnings response is not available yet."));

      if (shouldUseDemoEarningsFallback()) {
        view = demoEarningsView;
        notes.push("Demo earnings fallback is enabled through VITE_USE_DEMO_DRIVER_DATA.");
      }
    }

    return {
      ...view,
      backendNote: uniqueNotes(notes)
    };
  }
};

const mapEarningsResponses = (
  todayResponse: EarningsSummaryResponse,
  weekResponse: EarningsSummaryResponse,
  ridesResponse: EarningsRidesResponse,
  statementsResponse: EarningsStatementsResponse
): DriverEarningsView => {
  const today = todayResponse.data?.earnings;
  const week = weekResponse.data?.earnings;
  const todaySummary = today?.summary ?? {};
  const weekSummary = week?.summary ?? {};
  const rides = ridesResponse.data?.earnings?.rides ?? today?.recentRides ?? [];
  const statements = statementsResponse.data?.earnings?.statements ?? [];
  const availableForPayout = safeNumber(todaySummary.availableForPayout);
  const pendingEarnings = safeNumber(todaySummary.pendingEarnings);

  return {
    summary: {
      todayEarnings: safeNumber(todaySummary.netEarnings),
      weeklyEarnings: safeNumber(weekSummary.netEarnings),
      rideCount: safeNumber(todaySummary.completedRides, todaySummary.rideCount),
      availableForPayout,
      pendingEarnings,
      grossFare: safeNumber(todaySummary.grossFare),
      driverFare: safeNumber(todaySummary.driverFare),
      incentiveAmount: safeNumber(todaySummary.incentiveAmount),
      tipAmount: safeNumber(todaySummary.tipAmount),
      penaltyAmount: safeNumber(todaySummary.deductionAmount),
      platformFee: safeNumber(todaySummary.platformFee),
      averageNetPerRide: safeNumber(todaySummary.averageNetPerRide),
      payoutStatus: resolvePayoutStatus({ availableForPayout, pendingEarnings }),
      nextAction: today?.guidance?.nextAction || resolveEarningsNextAction(rides.length)
    },
    rides: rides.map(mapRideEarning),
    statements: statements.map(mapStatement),
    backendNote: null
  };
};

const mapRideEarning = (ride: BackendEarningRide): DriverRideEarning => ({
  rideId: ride.rideId || "ride-id",
  bookingCode: ride.bookingCode || "Unassigned booking",
  route: formatRideLabel(ride.vehicleType),
  completedAt: ride.completedAt ? formatDateTime(ride.completedAt) : "Recently completed",
  grossFare: safeNumber(ride.grossFare),
  driverFare: safeNumber(ride.driverFare),
  incentiveAmount: safeNumber(ride.incentiveAmount),
  tipAmount: safeNumber(ride.tipAmount),
  deductionAmount: safeNumber(ride.deductionAmount),
  netEarning: safeNumber(ride.netEarning),
  paymentStatus: ride.paymentStatus || "pending",
  guidance: ride.guidance || "Review payout status"
});

const mapStatement = (statement: BackendEarningStatement): DriverWeeklyStatement => ({
  statementId: statement.statementId || "statement-id",
  period: formatStatus(statement.period || "weekly"),
  rideCount: safeNumber(statement.rideCount),
  netEarnings: safeNumber(statement.summary?.netEarnings),
  availableForPayout: safeNumber(statement.summary?.availableForPayout),
  status: statement.status || "pending"
});

const formatRideLabel = (vehicleType?: string | null) => `${formatStatus(vehicleType || "ride")} earnings`;

const formatDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};

const formatStatus = (value: string) => value.replace(/_/g, " ");

const resolvePayoutStatus = ({
  availableForPayout,
  pendingEarnings
}: {
  availableForPayout: number;
  pendingEarnings: number;
}) => {
  if (availableForPayout > 0) {
    return "available";
  }

  if (pendingEarnings > 0) {
    return "pending";
  }

  return "not_started";
};

const resolveEarningsNextAction = (rideCount: number) => (
  rideCount > 0
    ? "Review ride-level earnings and payout status."
    : "Complete rides to build earnings and payout history."
);

const resolveBackendNote = (error: unknown, fallback: string) => {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
    return `${fallback} Backend returned ${error.status}; driver earnings permission or session may be missing.`;
  }

  if (error instanceof Error) {
    return `${fallback} ${error.message}`;
  }

  return fallback;
};

const safeNumber = (...values: Array<number | null | undefined>) => {
  const value = values.find((candidate) => typeof candidate === "number" && Number.isFinite(candidate));
  return value ?? 0;
};

const uniqueNotes = (notes: string[]) => {
  const joinedNotes = Array.from(new Set(notes.filter(Boolean))).join(" ");
  return joinedNotes || null;
};

const shouldUseDemoEarningsFallback = () => import.meta.env.VITE_USE_DEMO_DRIVER_DATA === "true";
