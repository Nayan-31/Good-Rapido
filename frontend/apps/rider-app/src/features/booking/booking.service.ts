import type { ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type { PricingQuote } from "@/features/pricing/pricing.types";
import type { BookingHomeForm, FareEstimate, VehicleType } from "./booking.types";
import { buildFareEstimatePayload, buildPricingComparisonPayload } from "./booking.utils";

type FareEstimateResponse = ApiResponse<{
  estimate: FareEstimate;
}>;

type PricingComparisonResponse = ApiResponse<{
  comparison: {
    quotes: PricingQuote[];
    recommendedQuote: {
      vehicleType: VehicleType;
      totalFare: number;
      confidenceScore: number;
      reason: string | null;
    } | null;
    summary: {
      totalOptions: number;
      lowestFare: number;
      highestFare: number;
      highSurgeOptions: number;
    };
  };
}>;

export const bookingService = {
  createFareEstimate(form: BookingHomeForm) {
    return apiClient.public.fare.createEstimate(buildFareEstimatePayload(form)) as Promise<FareEstimateResponse>;
  },
  compareVehicleOptions(form: BookingHomeForm, vehicleTypes: VehicleType[]) {
    return apiClient.core.pricingEngine.compare(
      buildPricingComparisonPayload(form, vehicleTypes)
    ) as Promise<PricingComparisonResponse>;
  }
};
