import type { ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type { RideHistoryItem } from "@/features/history/rideHistory.types";
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
  addHomeAddress() {
    return apiClient.public.profile.addSavedAddress({
      label: "Home",
      addressLine: "123 Green Park, Sector 5",
      city: "Kolkata",
      state: "West Bengal",
      country: "India",
      pincode: "700091",
      location: {
        latitude: 22.5726,
        longitude: 88.3639
      },
      isDefault: true
    }) as Promise<ProfileResponse>;
  },
  addEmergencyContact() {
    return apiClient.public.profile.addEmergencyContact({
      name: "Emergency Contact",
      phone: "+919876543210",
      relationship: "Family"
    }) as Promise<ProfileResponse>;
  }
};
