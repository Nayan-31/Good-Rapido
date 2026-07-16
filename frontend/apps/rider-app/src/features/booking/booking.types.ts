export type VehicleType = "bike" | "auto" | "cab_economy" | "cab_premium";

export interface BookingLocationForm {
  address: string;
  latitude: string;
  longitude: string;
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
}
