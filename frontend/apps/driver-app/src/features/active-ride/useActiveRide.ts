import { useCallback, useEffect, useMemo, useState } from "react";

import { activeRideService } from "./activeRide.service";
import type { DriverLifecycleEvent, LifecycleStep } from "./activeRide.types";
import type { DriverActiveRideSnapshot, DriverRideLifecycleStatus } from "@/features/ride-requests/rideRequest.types";

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
  const [backendNote, setBackendNote] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
    backendNote,
    message,
    error,
    isLoading,
    isSaving,
    progress,
    lifecycleSteps,
    nextEvent,
    reload: load,
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
