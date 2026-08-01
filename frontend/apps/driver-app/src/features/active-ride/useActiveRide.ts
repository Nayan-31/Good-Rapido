import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { activeRideService } from "./activeRide.service";
import type { DriverLifecycleEvent, DriverLiveLocation, LifecycleStep } from "./activeRide.types";
import type { DriverActiveRideSnapshot, DriverRideLifecycleStatus } from "@/features/ride-requests/rideRequest.types";

const LOCATION_SYNC_MIN_MS = 8000;

const lifecycleSteps: LifecycleStep[] = [
  {
    status: "driver_en_route",
    label: "Navigate to pickup",
    helper: "Follow pickup route and keep location sharing active."
  },
  {
    status: "driver_arrived",
    label: "Mark arrived",
    helper: "Confirm arrival only when you are at the pickup pin."
  },
  {
    status: "in_progress",
    label: "Start ride",
    helper: "Start once rider is onboard and route is confirmed."
  },
  {
    status: "completed",
    label: "Complete ride",
    helper: "Close fare, route fairness, and lifecycle logs."
  }
];

export function useActiveRide() {
  const [ride, setRide] = useState<DriverActiveRideSnapshot | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLiveLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [backendNote, setBackendNote] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastLocationSyncAtRef = useRef(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await activeRideService.loadActiveRide();
      setRide(result.ride);
      setBackendNote(result.backendNote);
    } catch (loadError) {
      setError(resolveError(loadError, "Unable to load active ride"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const syncDriverLocation = useCallback(async (location: DriverLiveLocation) => {
    setDriverLocation(location);

    const now = Date.now();

    if (now - lastLocationSyncAtRef.current < LOCATION_SYNC_MIN_MS) {
      return;
    }

    lastLocationSyncAtRef.current = now;

    try {
      await activeRideService.syncDriverLocation(location);
      setLocationError(null);
    } catch (syncError) {
      setLocationError(resolveError(syncError, "Unable to sync live GPS location"));
    }
  }, []);

  const stopLocationTracking = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = null;
    setIsLocationTracking(false);
  }, []);

  const startLocationTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Live GPS is not supported in this browser.");
      return;
    }

    setLocationError(null);
    setIsLocationTracking(true);

    const nextWatchId = navigator.geolocation.watchPosition(
      (position) => {
        void syncDriverLocation(toDriverLiveLocation(position));
      },
      (positionError) => {
        setIsLocationTracking(false);
        setLocationError(resolveGpsError(positionError));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000
      }
    );

    watchIdRef.current = nextWatchId;
  }, [syncDriverLocation]);

  useEffect(() => {
    const shouldTrack = Boolean(
      ride
        && ride.lifecycleStatus !== "completed"
        && ride.lifecycleStatus !== "cancelled"
    );

    if (shouldTrack) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
  }, [ride?.id, ride?.lifecycleStatus, startLocationTracking, stopLocationTracking]);

  useEffect(() => () => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
  }, []);

  const transition = useCallback(async (event: DriverLifecycleEvent) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const result = await activeRideService.transitionRide(event);
      setRide(result.ride);
      setMessage(result.message);
      setBackendNote(result.backendNote ?? backendNote);
    } catch (transitionError) {
      setError(resolveError(transitionError, "Unable to update ride lifecycle"));
    } finally {
      setIsSaving(false);
    }
  }, [backendNote]);

  const progress = useMemo(() => resolveProgress(ride?.lifecycleStatus), [ride?.lifecycleStatus]);
  const nextEvent = useMemo(() => resolveNextEvent(ride?.lifecycleStatus), [ride?.lifecycleStatus]);

  return {
    ride,
    driverLocation,
    locationError,
    isLocationTracking,
    backendNote,
    message,
    error,
    isLoading,
    isSaving,
    progress,
    lifecycleSteps,
    nextEvent,
    reload: load,
    startLocationTracking,
    stopLocationTracking,
    markArrived: () => transition("driver_arrived"),
    startRide: () => transition("ride_started"),
    completeRide: () => transition("ride_completed")
  };
}

const resolveProgress = (status: DriverRideLifecycleStatus | null | undefined) => {
  if (status === "completed") {
    return 100;
  }

  if (status === "in_progress") {
    return 72;
  }

  if (status === "driver_arrived") {
    return 48;
  }

  if (status === "driver_en_route") {
    return 24;
  }

  return 8;
};

const resolveNextEvent = (status: DriverRideLifecycleStatus | null | undefined): DriverLifecycleEvent | null => {
  if (status === "driver_en_route") {
    return "driver_arrived";
  }

  if (status === "driver_arrived") {
    return "ride_started";
  }

  if (status === "in_progress") {
    return "ride_completed";
  }

  return null;
};

const resolveError = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

const toDriverLiveLocation = (position: GeolocationPosition): DriverLiveLocation => {
  const { coords } = position;

  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracyMeters: Number.isFinite(coords.accuracy) ? Math.round(coords.accuracy) : null,
    headingDegrees: Number.isFinite(coords.heading) ? Math.round(coords.heading ?? 0) : null,
    speedKmph: Number.isFinite(coords.speed) ? Math.max(0, Math.round((coords.speed ?? 0) * 3.6)) : null,
    capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
    source: "gps"
  };
};

const resolveGpsError = (error: GeolocationPositionError) => {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission denied. Enable browser location access to move the bike on the live map.";
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Live GPS location is unavailable from this device.";
  }

  if (error.code === error.TIMEOUT) {
    return "Live GPS request timed out. Retry from the active ride screen.";
  }

  return error.message || "Unable to read live GPS location.";
};
