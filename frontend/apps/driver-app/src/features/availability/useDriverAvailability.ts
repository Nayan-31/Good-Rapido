import { useCallback, useEffect, useState } from "react";

import { ApiClientError } from "@good-rapido/api-client";
import { driverAvailabilityService } from "./availability.service";
import type {
  DriverAvailabilityForm,
  DriverAvailabilityState,
  DriverAvailabilityStatus,
  DriverLocationForm
} from "./availability.types";

const defaultLocationForm: DriverLocationForm = {
  latitude: "22.5726",
  longitude: "88.3639",
  accuracyMeters: "24",
  addressLabel: "Salt Lake Sector V, Kolkata"
};

const defaultAvailabilityForm: DriverAvailabilityForm = {
  activeServiceZones: "kolkata, salt-lake-sector-v",
  statusReason: ""
};

export function useDriverAvailability() {
  const [availability, setAvailability] = useState<DriverAvailabilityState | null>(null);
  const [locationForm, setLocationForm] = useState(defaultLocationForm);
  const [availabilityForm, setAvailabilityForm] = useState(defaultAvailabilityForm);
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
        addressLabel: nextAvailability.currentLocation.addressLabel ?? defaultLocationForm.addressLabel
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
    const response = await driverAvailabilityService.updateStatus(status, locationForm, availabilityForm);
    applyAvailability(response.data?.availability ?? null);
    return response.message || "Driver availability updated";
  });

  const shareLocation = () => runAction(async () => {
    const response = await driverAvailabilityService.updateLocation(locationForm, availabilityForm);
    applyAvailability(response.data?.availability ?? null);
    return response.message || "Driver location shared";
  });

  const saveZones = () => runAction(async () => {
    const response = await driverAvailabilityService.updateZones(availabilityForm);
    applyAvailability(response.data?.availability ?? null);
    return response.message || "Driver service zones updated";
  });

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
    saveZones
  };
}

const resolveError = (error: unknown, fallback: string) => {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return fallback;
};
