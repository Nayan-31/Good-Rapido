import type { ApiPayload, ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type {
  DriverAvailabilityForm,
  DriverAvailabilityState,
  DriverAvailabilityStatus,
  DriverLocationForm
} from "./availability.types";

type AvailabilityResponse = ApiResponse<{ availability: DriverAvailabilityState }>;

export const driverAvailabilityService = {
  async getStatus() {
    await apiClient.private.driver.getProfile();
    return apiClient.private.availability.getStatus() as Promise<AvailabilityResponse>;
  },

  updateStatus(status: DriverAvailabilityStatus, locationForm: DriverLocationForm, availabilityForm: DriverAvailabilityForm) {
    return apiClient.private.availability.updateStatus({
      status,
      currentLocation: buildLocationPayload(locationForm),
      activeServiceZones: parseZones(availabilityForm.activeServiceZones),
      ...(availabilityForm.statusReason.trim() ? { statusReason: availabilityForm.statusReason.trim() } : {})
    }) as Promise<AvailabilityResponse>;
  },

  updateLocation(locationForm: DriverLocationForm, availabilityForm: DriverAvailabilityForm) {
    return apiClient.private.availability.updateLocation({
      currentLocation: buildLocationPayload(locationForm),
      activeServiceZones: parseZones(availabilityForm.activeServiceZones)
    }) as Promise<AvailabilityResponse>;
  },

  updateZones(availabilityForm: DriverAvailabilityForm) {
    return apiClient.private.availability.updateZones({
      activeServiceZones: parseZones(availabilityForm.activeServiceZones)
    }) as Promise<AvailabilityResponse>;
  }
};

const buildLocationPayload = (form: DriverLocationForm): ApiPayload => ({
  latitude: Number(form.latitude),
  longitude: Number(form.longitude),
  accuracyMeters: Number(form.accuracyMeters),
  addressLabel: form.addressLabel.trim(),
  source: "manual",
  capturedAt: new Date().toISOString()
});

const parseZones = (value: string) => value
  .split(",")
  .map((zone) => zone.trim())
  .filter(Boolean);
