import { useCallback, useEffect, useState } from "react";

import { ApiClientError } from "@good-rapido/api-client";
import type { RideHistoryItem } from "@/features/history/rideHistory.types";
import { profileService } from "./profile.service";
import type { ProfileDashboard, RiderProfile } from "./profile.types";
import { buildProfileTransparency } from "./profile.utils";

export function useProfileDashboard() {
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [rideHistory, setRideHistory] = useState<RideHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);

    const [profileResult, rideResult] = await Promise.allSettled([
      profileService.getProfile(),
      profileService.getRecentRides()
    ]);

    if (profileResult.status === "fulfilled") {
      setProfile(profileResult.value.data?.profile ?? null);
    }

    if (rideResult.status === "fulfilled") {
      setRideHistory(rideResult.value.data?.history ?? []);
    }

    if (profileResult.status === "rejected" && rideResult.status === "rejected") {
      setMessage(resolveErrorMessage(profileResult.reason));
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const toggleNotification = useCallback(async (channel: keyof RiderProfile["preferences"]["notifications"], enabled: boolean) => {
    if (!profile) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const nextPreferences = {
        ...profile.preferences.notifications,
        [channel]: enabled
      };
      const response = await profileService.updateNotificationPreferences(nextPreferences);

      setProfile(response.data?.profile ?? {
        ...profile,
        preferences: {
          ...profile.preferences,
          notifications: nextPreferences
        }
      });
      setMessage(response.message);
    } catch (error) {
      setMessage(resolveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [profile]);

  const addHomeAddress = useCallback(async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await profileService.addHomeAddress();
      setProfile(response.data?.profile ?? null);
      setMessage(response.message);
    } catch (error) {
      setMessage(resolveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, []);

  const addEmergencyContact = useCallback(async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await profileService.addEmergencyContact();
      setProfile(response.data?.profile ?? null);
      setMessage(response.message);
    } catch (error) {
      setMessage(resolveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, []);

  const dashboard: ProfileDashboard = {
    profile,
    rideHistory,
    transparency: buildProfileTransparency(profile, rideHistory)
  };

  return {
    ...dashboard,
    isLoading,
    isSaving,
    message,
    loadProfile,
    toggleNotification,
    addHomeAddress,
    addEmergencyContact
  };
}

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return "Profile request failed";
};
