import type { ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type { BookingHomeForm, VehicleType } from "@/features/booking/booking.types";
import type { MatchingResult } from "./matching.types";
import { buildMatchingPayload } from "./matching.utils";

type MatchingResponse = ApiResponse<{
  matching: MatchingResult;
}>;

type RideBookingSearchResponse = ApiResponse<{
  search?: {
    driverOptions?: RideBookingDriverOption[];
    trustSummary?: Record<string, unknown>;
  };
}>;

interface RideBookingDriverOption {
  driverId?: string | null;
  fullName?: string | null;
  vehicle?: {
    type?: VehicleType | null;
    name?: string | null;
    number?: string | null;
    color?: string | null;
  } | null;
  rating?: number;
  etaMinutes?: number;
  distanceKm?: number;
  routeFairnessScore?: number;
  detourPercentage?: number;
  onTimeArrivalScore?: number;
  cancellationRatio?: number;
  trustScore?: number;
  reliabilityScore?: number;
  cancellationRiskScore?: number;
  cancellationRiskLevel?: string | null;
  completedRides?: number;
  matchRank?: number;
  matchScore?: number;
  matchReasons?: string[];
}

export const matchingService = {
  match(form: BookingHomeForm) {
    return apiClient.core.matchingEngine.match(buildMatchingPayload(form)) as Promise<MatchingResponse>;
  },

  async searchRideBookingDrivers(fareEstimateId: string, limit = 3): Promise<MatchingResponse> {
    const response = await apiClient.public.rideBooking.search({
      fareEstimateId,
      limit
    }) as RideBookingSearchResponse;
    const search = response.data?.search;

    return {
      success: response.success,
      message: response.message,
      data: {
        matching: {
          matches: (search?.driverOptions ?? []).map(toDriverMatch),
          summary: search?.trustSummary ?? {}
        }
      }
    };
  }
};

const toDriverMatch = (driver: RideBookingDriverOption) => ({
  driverId: driver.driverId ?? "",
  fullName: driver.fullName ?? null,
  vehicle: {
    type: driver.vehicle?.type ?? null,
    name: driver.vehicle?.name ?? null,
    number: driver.vehicle?.number ?? null,
    color: driver.vehicle?.color ?? null
  },
  rating: numberOrZero(driver.rating),
  etaMinutes: numberOrZero(driver.etaMinutes),
  distanceKm: numberOrZero(driver.distanceKm),
  match: {
    rank: numberOrZero(driver.matchRank),
    score: numberOrZero(driver.matchScore),
    reasons: driver.matchReasons ?? [],
    scoreBreakdown: {}
  },
  trustSignals: {
    trustScore: numberOrZero(driver.trustScore),
    reliabilityScore: numberOrZero(driver.reliabilityScore),
    routeFairnessScore: numberOrZero(driver.routeFairnessScore),
    routeAccuracyScore: 0,
    cancellationRiskScore: numberOrZero(driver.cancellationRiskScore),
    cancellationRiskLevel: driver.cancellationRiskLevel ?? null,
    cancellationRatio: numberOrZero(driver.cancellationRatio),
    detourPercentage: numberOrZero(driver.detourPercentage),
    onTimeArrivalScore: numberOrZero(driver.onTimeArrivalScore),
    transparencyScore: Math.round((
      numberOrZero(driver.trustScore)
      + numberOrZero(driver.routeFairnessScore)
      + numberOrZero(driver.onTimeArrivalScore)
    ) / 3)
  },
  completedRides: numberOrZero(driver.completedRides)
});

const numberOrZero = (value: unknown) => (
  typeof value === "number" && Number.isFinite(value) ? value : 0
);
