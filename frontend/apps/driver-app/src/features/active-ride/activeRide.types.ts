import type { DriverActiveRideSnapshot, DriverRideLifecycleStatus } from "@/features/ride-requests/rideRequest.types";

export type DriverLifecycleEvent = "driver_arrived" | "ride_started" | "ride_completed";

export interface DriverLiveLocation {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  headingDegrees: number | null;
  speedKmph: number | null;
  capturedAt: string;
  source: "gps";
}

export interface ActiveRideLoadResult {
  ride: DriverActiveRideSnapshot | null;
  backendNote: string | null;
}

export interface ActiveRideActionResult {
  ride: DriverActiveRideSnapshot;
  message: string;
  backendNote: string | null;
}

export interface LifecycleStep {
  status: DriverRideLifecycleStatus;
  label: string;
  helper: string;
}
