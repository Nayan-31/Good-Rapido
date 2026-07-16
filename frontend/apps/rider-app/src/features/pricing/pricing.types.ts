import type { BookingLocationForm, VehicleType } from "@/features/booking/booking.types";

export interface PricingQuote {
  quoteType: "single" | "comparison";
  vehicleType: VehicleType | null;
  serviceZone: string;
  requestedAt: string | null;
  pickup: PricingLocation;
  dropoff: PricingLocation;
  distanceKm: number;
  durationMinutes: number;
  route: {
    providerSource: string | null;
    routePreference: string | null;
    traffic: {
      level: string | null;
      multiplier: number;
    };
    quality: {
      score: number;
      level: string | null;
      routeAccuracyScore: number;
    };
  } | null;
  pricingRule: {
    id: string | null;
    ruleCode: string | null;
    label: string | null;
    source: string;
    serviceZone: string;
    vehicleType: VehicleType | null;
    effectiveFrom: string | null;
    effectiveUntil: string | null;
  };
  breakdown: PricingBreakdown;
  surge: {
    multiplier: number;
    level: string | null;
    reason: string | null;
  };
  confidence: {
    score: number;
    level: string | null;
    factors: string[];
  };
  alternativePickups: Array<{
    label: string | null;
    pickup: PricingLocation;
    walkingDistanceMeters: number;
    estimatedSavings: number;
    estimatedFare: number;
    reason: string | null;
  }>;
  validity: {
    validUntil: string | null;
    lockWindowMinutes: number;
    lockExpiresAt: string | null;
  };
  guidance: {
    withinMinimumFare: boolean;
    highSurge: boolean;
    confidenceLevel: string | null;
    nextAction: string | null;
  };
}

export interface PricingBreakdown {
  currency: string;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  minFareAdjustment: number;
  surgeFare: number;
  platformFee: number;
  taxes: number;
  totalFare: number;
}

export interface PricingLocation {
  address: string | null;
  latitude: number;
  longitude: number;
}

export interface PricingQuotePayload {
  pickup: BookingLocationForm;
  dropoff: BookingLocationForm;
  vehicleType: VehicleType;
}
