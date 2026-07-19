import type { DriverActiveRideSnapshot } from "./rideRequest.types";

const ACTIVE_RIDE_STORAGE_KEY = "goodRapido.driverActiveRide";

export const readActiveDriverRide = (): DriverActiveRideSnapshot | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawSnapshot = localStorage.getItem(ACTIVE_RIDE_STORAGE_KEY);

  if (!rawSnapshot) {
    return null;
  }

  try {
    return JSON.parse(rawSnapshot) as DriverActiveRideSnapshot;
  } catch {
    localStorage.removeItem(ACTIVE_RIDE_STORAGE_KEY);
    return null;
  }
};

export const saveActiveDriverRide = (ride: DriverActiveRideSnapshot) => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(ACTIVE_RIDE_STORAGE_KEY, JSON.stringify(ride));
};

export const clearActiveDriverRide = () => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(ACTIVE_RIDE_STORAGE_KEY);
};
