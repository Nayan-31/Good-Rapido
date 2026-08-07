import { useCallback, useEffect, useState } from "react";

import { createEmptyProfileView, driverProfileService } from "./profile.service";
import type { DriverAccountSettings, DriverProfileView } from "./profile.types";

export function useDriverProfile() {
  const [profile, setProfile] = useState<DriverProfileView>(() => createEmptyProfileView());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setProfile(await driverProfileService.loadProfile());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load driver profile");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateSetting = useCallback(async <TKey extends keyof DriverAccountSettings>(
    key: TKey,
    value: DriverAccountSettings[TKey]
  ) => {
    const nextSettings = {
      ...profile.settings,
      [key]: value
    };

    setProfile((current) => ({
      ...current,
      settings: nextSettings
    }));
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const backendNote = await driverProfileService.updateSettings(nextSettings);

    setProfile((current) => ({
      ...current,
      backendNote: backendNote ?? current.backendNote
    }));
    setMessage("Account settings updated.");
    setIsSaving(false);
  }, [profile.settings]);

  return {
    profile,
    message,
    error,
    isLoading,
    isSaving,
    reload: load,
    updateSetting
  };
}
