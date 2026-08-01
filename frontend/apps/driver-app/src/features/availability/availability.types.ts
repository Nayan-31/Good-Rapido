export type DriverAvailabilityStatus = "offline" | "online" | "paused";

export interface DriverLocationForm {
  latitude: string;
  longitude: string;
  accuracyMeters: string;
  addressLabel: string;
  headingDegrees?: string;
  speedKmph?: string;
  source?: "gps" | "network" | "manual";
  capturedAt?: string;
}

export interface DriverAvailabilityForm {
  activeServiceZones: string;
  statusReason: string;
}

export interface DriverAvailabilityState {
  status: DriverAvailabilityStatus;
  isOnline: boolean;
  isPaused: boolean;
  activeServiceZones: string[];
  currentLocation: {
    latitude: number;
    longitude: number;
    accuracyMeters: number | null;
    headingDegrees: number | null;
    speedKmph: number | null;
    addressLabel: string | null;
    source: string;
    capturedAt: string | null;
  } | null;
  statusReason: string | null;
  lastOnlineAt: string | null;
  lastOfflineAt: string | null;
  lastHeartbeatAt: string | null;
  heartbeatAgeSeconds: number | null;
  guidance: {
    canGoOnline: boolean;
    blockers: string[];
    locationFresh: boolean;
    rideRequestsEnabled: boolean;
    approvalStatus: string;
    onboardingStatus: string;
    primaryServiceZone: string | null;
    heartbeatTtlSeconds: number;
  };
}
