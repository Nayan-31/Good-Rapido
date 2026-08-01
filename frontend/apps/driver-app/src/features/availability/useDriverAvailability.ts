import { useCallback, useEffect, useState } from "react";

import { ApiClientError } from "@good-rapido/api-client";
import { driverAvailabilityService } from "./availability.service";
import type {
  DriverAvailabilityForm,
  DriverAvailabilityState,
  DriverAvailabilityStatus,
  DriverLocationForm
} from "./availability.types";
import { useDriverGps } from "./useDriverGps";

const GPS_HEARTBEAT_MS = 45_000;

const defaultLocationForm: DriverLocationForm = {
  latitude: "22.5726",
  longitude: "88.3639",
  accuracyMeters: "24",
  addressLabel: "Salt Lake Sector V, Kolkata",
  source: "manual"
};

const defaultAvailabilityForm: DriverAvailabilityForm = {
  activeServiceZones: "kolkata, salt-lake-sector-v",
  statusReason: ""
};

export function useDriverAvailability() {
  const driverGps = useDriverGps();
  const getCurrentGpsLocation = driverGps.getCurrentLocation;
  const [availability, setAvailability] = useState<DriverAvailabilityState | null>(null);
  const [locationForm, setLocationForm] = useState(defaultLocationForm);
  const [availabilityForm, setAvailabilityForm] = useState(defaultAvailabilityForm);
  const [gpsSharingEnabled, setGpsSharingEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const applyAvailability = useCallback((nextAvailability: DriverAvailabilityState | null) => {
    setAvailability(nextAvailability);

    if (!nextAvailability) {
      return;
    }

    setAvailabilityForm((current) => ({
      ...current,
      activeServiceZones: nextAvailability.activeServiceZones.length
        ? nextAvailability.activeServiceZones.join(", ")
        : nextAvailability.guidance.primaryServiceZone ?? current.activeServiceZones,
      statusReason: nextAvailability.statusReason ?? current.statusReason
    }));

    if (nextAvailability.currentLocation) {
      setLocationForm({
        latitude: String(nextAvailability.currentLocation.latitude),
        longitude: String(nextAvailability.currentLocation.longitude),
        accuracyMeters: String(nextAvailability.currentLocation.accuracyMeters ?? 24),
        addressLabel: nextAvailability.currentLocation.addressLabel ?? defaultLocationForm.addressLabel,
        headingDegrees: nextAvailability.currentLocation.headingDegrees !== null
          && nextAvailability.currentLocation.headingDegrees !== undefined
          ? String(nextAvailability.currentLocation.headingDegrees)
          : undefined,
        speedKmph: nextAvailability.currentLocation.speedKmph !== null
          && nextAvailability.currentLocation.speedKmph !== undefined
          ? String(nextAvailability.currentLocation.speedKmph)
          : undefined,
        source: nextAvailability.currentLocation.source === "gps" ? "gps" : "manual",
        capturedAt: nextAvailability.currentLocation.capturedAt ?? undefined
      });
    }
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await driverAvailabilityService.getStatus();
      applyAvailability(response.data?.availability ?? null);
    } catch (loadError) {
      setError(resolveError(loadError, "Unable to load driver availability"));
    } finally {
      setIsLoading(false);
    }
  }, [applyAvailability]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = useCallback(async (action: () => Promise<string>) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const nextMessage = await action();
      setMessage(nextMessage);
    } catch (actionError) {
      setError(resolveError(actionError, "Availability update failed"));
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateStatus = (status: DriverAvailabilityStatus) => runAction(async () => {
    let nextLocationForm = locationForm;

    if (status === "online") {
      nextLocationForm = await getCurrentGpsLocation();
      setGpsSharingEnabled(true);
      setLocationForm(nextLocationForm);
    }

    if (status === "offline") {
      setGpsSharingEnabled(false);
    }

    const response = await driverAvailabilityService.updateStatus(status, nextLocationForm, availabilityForm);
    applyAvailability(response.data?.availability ?? null);
    return response.message || "Driver availability updated";
  });

  const shareLocation = () => runAction(async () => {
    const response = await driverAvailabilityService.updateLocation(locationForm, availabilityForm);
    applyAvailability(response.data?.availability ?? null);
    return response.message || "Driver location shared";
  });

  const shareGpsLocation = () => runAction(async () => {
    const gpsLocation = await getCurrentGpsLocation();
    setGpsSharingEnabled(true);
    setLocationForm(gpsLocation);
    const response = await driverAvailabilityService.updateLocation(gpsLocation, availabilityForm);
    applyAvailability(response.data?.availability ?? null);
    return response.message || "GPS location shared";
  });

  const saveZones = () => runAction(async () => {
    const response = await driverAvailabilityService.updateZones(availabilityForm);
    applyAvailability(response.data?.availability ?? null);
    return response.message || "Driver service zones updated";
  });

  const syncGpsHeartbeat = useCallback(async () => {
    try {
      const gpsLocation = await getCurrentGpsLocation();
      setLocationForm(gpsLocation);
      const response = await driverAvailabilityService.updateLocation(gpsLocation, availabilityForm);
      applyAvailability(response.data?.availability ?? null);
    } catch (heartbeatError) {
      setGpsSharingEnabled(false);
      setError(resolveError(heartbeatError, "GPS location sharing stopped"));
    }
  }, [applyAvailability, availabilityForm, getCurrentGpsLocation]);

  useEffect(() => {
    if (!gpsSharingEnabled || !availability?.isOnline) {
      return;
    }

    const heartbeatId = window.setInterval(() => {
      void syncGpsHeartbeat();
    }, GPS_HEARTBEAT_MS);

    return () => window.clearInterval(heartbeatId);
  }, [availability?.isOnline, gpsSharingEnabled, syncGpsHeartbeat]);

  return {
    availability,
    locationForm,
    setLocationForm,
    availabilityForm,
    setAvailabilityForm,
    message,
    error,
    isLoading,
    isSaving,
    reload: load,
    updateStatus,
    shareLocation,
    shareGpsLocation,
    saveZones,
    gps: {
      isSupported: driverGps.isSupported,
      permissionState: driverGps.permissionState,
      isLocating: driverGps.isLocating,
      error: driverGps.gpsError,
      lastGpsAt: driverGps.lastGpsAt,
      isSharing: gpsSharingEnabled,
      stopSharing: () => setGpsSharingEnabled(false)
    }
  };
}

const resolveError = (error: unknown, fallback: string) => {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return fallback;
};
