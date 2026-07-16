import type { VehicleType } from "@/features/booking/booking.types";

export interface DriverMatch {
  driverId: string;
  fullName: string | null;
  vehicle: {
    type: VehicleType | null;
    name: string | null;
    number: string | null;
    color: string | null;
  };
  rating: number;
  etaMinutes: number;
  distanceKm: number;
  match: {
    rank: number;
    score: number;
    reasons: string[];
    scoreBreakdown: Record<string, number>;
  };
  trustSignals: {
    trustScore: number;
    reliabilityScore: number;
    routeFairnessScore: number;
    routeAccuracyScore: number;
    cancellationRiskScore: number;
    cancellationRiskLevel: string | null;
    cancellationRatio: number;
    detourPercentage: number;
    onTimeArrivalScore: number;
    transparencyScore: number;
  };
  completedRides: number;
}

export interface MatchingResult {
  matches: DriverMatch[];
  summary: Record<string, unknown>;
}
