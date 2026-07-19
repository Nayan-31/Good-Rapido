export type DriverRideLifecycleStatus =
  | "pending_confirmation"
  | "driver_en_route"
  | "driver_arrived"
  | "in_progress"
  | "completed"
  | "cancelled";

export type DriverRideRiskLevel = "low" | "medium" | "high";

export interface DriverRideLocation {
  address: string;
  latitude: number;
  longitude: number;
}

export interface DriverRideFare {
  currency: "INR";
  totalFare: number;
  driverPayout: number;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeBonus: number;
  platformFee: number;
  distanceKm: number;
  durationMinutes: number;
  confidenceScore: number;
}

export interface DriverRideRouteSummary {
  pickupEtaMinutes: number;
  pickupDistanceKm: number;
  tripDistanceKm: number;
  tripDurationMinutes: number;
  routeFairnessScore: number;
  routeAccuracyScore: number;
  detourPercentage: number;
  trafficLevel: "normal" | "moderate" | "heavy";
}

export interface DriverRideRiderTrust {
  riderName: string;
  rating: number;
  completedRides: number;
  verificationStatus: string;
  cancellationRiskLevel: DriverRideRiskLevel;
  cancellationRiskScore: number;
  fareConfidenceScore: number;
  fairPriceScore: number;
}

export interface DriverRideRequest {
  id: string;
  bookingCode: string;
  bookingStatus: string;
  lifecycleStatus: DriverRideLifecycleStatus;
  pickup: DriverRideLocation;
  dropoff: DriverRideLocation;
  vehicleType: string;
  requestedAt: string;
  fare: DriverRideFare;
  route: DriverRideRouteSummary;
  rider: DriverRideRiderTrust;
  transparencyNotes: string[];
}

export interface DriverActiveRideSnapshot extends DriverRideRequest {
  acceptedAt: string;
  lifecycleStatus: DriverRideLifecycleStatus;
  timeline: {
    confirmedAt?: string | null;
    driverArrivedAt?: string | null;
    rideStartedAt?: string | null;
    completedAt?: string | null;
  };
}

export interface RideRequestLoadResult {
  request: DriverRideRequest | null;
  backendNote: string | null;
}

export interface RideRequestActionResult {
  activeRide?: DriverActiveRideSnapshot;
  message: string;
  backendNote?: string | null;
}
