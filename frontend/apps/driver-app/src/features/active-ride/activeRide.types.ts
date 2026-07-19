import type { DriverActiveRideSnapshot, DriverRideLifecycleStatus } from "@/features/ride-requests/rideRequest.types";

export type DriverLifecycleEvent = "driver_arrived" | "ride_started" | "ride_completed";

export interface ActiveRideLoadResult {
  ride: DriverActiveRideSnapshot;
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
