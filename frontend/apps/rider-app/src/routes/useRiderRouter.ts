import { useCallback, useEffect, useMemo, useState } from "react";

import {
  defaultRiderRoute,
  findRiderRouteById,
  findRiderRouteByPath,
  normalizeRoutePath,
  type RiderRouteId
} from "./riderRoutes";

const readHashPath = () => {
  if (typeof window === "undefined") {
    return defaultRiderRoute.path;
  }

  return normalizeRoutePath(window.location.hash);
};

export function useRiderRouter() {
  const [path, setPath] = useState(readHashPath);

  useEffect(() => {
    const syncPath = () => {
      setPath(readHashPath());
    };

    window.addEventListener("hashchange", syncPath);

    if (!window.location.hash) {
      window.history.replaceState(null, "", `#${defaultRiderRoute.path}`);
      syncPath();
    }

    return () => window.removeEventListener("hashchange", syncPath);
  }, []);

  const route = useMemo(() => findRiderRouteByPath(path), [path]);

  const navigate = useCallback((routeId: RiderRouteId) => {
    const nextRoute = findRiderRouteById(routeId);
    window.location.hash = nextRoute.path;
  }, []);

  return {
    route,
    path,
    navigate
  };
}
