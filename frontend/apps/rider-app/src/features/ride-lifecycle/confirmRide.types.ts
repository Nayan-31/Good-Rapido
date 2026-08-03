import type { ApiResponse } from "@good-rapido/api-client";
import type { FareEstimate, VehicleType } from "@/features/booking/booking.types";
import type { DriverMatch } from "@/features/matching";
import type { PricingQuote } from "@/features/pricing/pricing.types";

export interface RideBooking {
  id: string;
  bookingCode: string;
  status: string;
  fareEstimateId: string;
  vehicleType: VehicleType;
  pickup: {
    address: string | null;
    latitude: number;
    longitude: number;
  };
  dropoff: {
    address: string | null;
    latitude: number;
    longitude: number;
  };
  selectedDriver: {
    driverId: string;
    fullName: string | null;
    rating: number;
    vehicleName: string | null;
    vehicleNumber: string | null;
    vehicleColor: string | null;
    etaMinutes: number;
    distanceKm: number;
  };
  fareSnapshot: {
    currency: string;
    totalFare: number;
    distanceKm: number;
    durationMinutes: number;
    surgeMultiplier: number;
    confidenceScore: number;
    validUntil: string | null;
    lockedUntil: string | null;
  };
  trustSignals: {
    driverTrustScore: number;
    driverReliabilityScore: number;
    routeFairnessScore: number;
    routeAccuracyScore: number;
    cancellationRiskScore: number;
    cancellationRiskLevel: string | null;
    fairPriceScore: number;
  };
  paymentMethod: string | null;
  expiresAt: string | null;
  confirmedAt: string | null;
}

export interface RideLifecycleView {
  ride: {
    id: string | null;
    bookingCode: string | null;
    bookingStatus: string | null;
    vehicleType: VehicleType | null;
    pickup: RideBooking["pickup"];
    dropoff: RideBooking["dropoff"];
    driver: RideBooking["selectedDriver"];
    fare: RideBooking["fareSnapshot"];
    trustSignals: RideBooking["trustSignals"];
  };
  lifecycleStatus: string;
  progress: {
    percentage: number;
    currentStep: string | null;
    nextAction: string | null;
  };
  guidance: Record<string, unknown>;
  availableEvents: string[];
}

export type RideBookingResponse = ApiResponse<{
  booking: RideBooking;
}>;

export type RideLifecycleResponse = ApiResponse<{
  lifecycle: RideLifecycleView;
}>;

export interface ConfirmRideDraft {
  fareEstimate: FareEstimate;
  pricingQuote?: PricingQuote | null;
  selectedDriver?: DriverMatch | null;
}
