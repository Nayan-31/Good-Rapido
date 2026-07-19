import { useCallback, useEffect, useState } from "react";

import { demoTrustProfile, driverTrustService } from "./trust.service";
import type { DriverTrustProfileView } from "./trust.types";

export function useDriverTrust() {
  const [profile, setProfile] = useState<DriverTrustProfileView>(demoTrustProfile);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setProfile(await driverTrustService.loadTrustProfile());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load driver trust profile");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    profile,
    error,
    isLoading,
    reload: load
  };
}
