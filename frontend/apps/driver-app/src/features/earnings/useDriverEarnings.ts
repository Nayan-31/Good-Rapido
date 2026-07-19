import { useCallback, useEffect, useState } from "react";

import { driverEarningsService, demoEarningsView } from "./earnings.service";
import type { DriverEarningsView } from "./earnings.types";

export function useDriverEarnings() {
  const [earnings, setEarnings] = useState<DriverEarningsView>(demoEarningsView);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setEarnings(await driverEarningsService.loadEarnings());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load driver earnings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    earnings,
    error,
    isLoading,
    reload: load
  };
}
