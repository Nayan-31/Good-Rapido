import type { ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type { RideHistoryItem, RideLocation } from "@/features/history/rideHistory.types";
import type { ProfilePreferences, RiderProfile } from "./profile.types";

type ProfileResponse = ApiResponse<{
  profile: RiderProfile;
}>;

type RideHistoryResponse = ApiResponse<{
  history: RideHistoryItem[];
}>;

export const profileService = {
  getProfile() {
    return apiClient.public.profile.getMe() as Promise<ProfileResponse>;
  },
  getRecentRides() {
    return apiClient.public.rides.getHistory({
      status: "all",
      limit: 8
    }) as Promise<RideHistoryResponse>;
  },
  updateNotificationPreferences(preferences: ProfilePreferences["notifications"]) {
    return apiClient.public.profile.updatePreferences({
      notifications: preferences
    }) as Promise<ProfileResponse>;
  },
  addHomeAddress(location?: RideLocation | null) {
    const payload = {
      label: "Home",
      addressLine: location?.address ?? "Saved home location",
      country: "India",
      isDefault: true
    } as Record<string, unknown>;

    if (location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
      payload.location = {
        latitude: location.latitude,
        longitude: location.longitude
      };
    }

    return apiClient.public.profile.addSavedAddress(payload) as Promise<ProfileResponse>;
  },
  addEmergencyContact() {
    return apiClient.public.profile.addEmergencyContact({
      name: "Emergency Contact",
      phone: "+919876543210",
      relationship: "Family"
    }) as Promise<ProfileResponse>;
  }
};
