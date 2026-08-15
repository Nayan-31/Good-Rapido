export type VehicleType = "bike" | "auto" | "cab_economy" | "cab_premium";

export interface BookingLocationForm {
  address: string;
  latitude: string;
  longitude: string;
}

export interface LocationSuggestion {
  id: string;
  address: string;
  context: string;
  latitude: string;
  longitude: string;
  provider: "local" | "google" | string;
}

export interface BookingHomeForm {
  pickup: BookingLocationForm;
  dropoff: BookingLocationForm;
  vehicleType: VehicleType;
  passengers: string;
}

export interface BookingHomeErrors {
  pickup?: Partial<Record<keyof BookingLocationForm, string>>;
  dropoff?: Partial<Record<keyof BookingLocationForm, string>>;
  passengers?: string;
}

export interface FareEstimate {
  id: string;
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
  distanceKm: number;
  durationMinutes: number;
  breakdown: {
    currency: string;
    totalFare: number;
  };
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
  validUntil: string | null;
  lock?: {
    isLocked: boolean;
    lockedUntil: string | null;
  };
}
