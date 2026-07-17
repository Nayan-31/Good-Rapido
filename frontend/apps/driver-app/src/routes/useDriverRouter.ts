import { useCallback, useEffect, useMemo, useState } from "react";

import {
  defaultDriverRoute,
  findDriverRouteById,
  findDriverRouteByPath,
  normalizeRoutePath,
  type DriverRouteId
} from "./driverRoutes";

const readHashPath = () => {
  if (typeof window === "undefined") {
    return defaultDriverRoute.path;
  }

  return normalizeRoutePath(window.location.hash);
};

export function useDriverRouter() {
  const [path, setPath] = useState(readHashPath);

  useEffect(() => {
    const syncPath = () => {
      setPath(readHashPath());
    };

    window.addEventListener("hashchange", syncPath);

    if (!window.location.hash) {
      window.history.replaceState(null, "", `#${defaultDriverRoute.path}`);
      syncPath();
    }

    return () => window.removeEventListener("hashchange", syncPath);
  }, []);

  const route = useMemo(() => findDriverRouteByPath(path), [path]);

  const navigate = useCallback((routeId: DriverRouteId) => {
    const nextRoute = findDriverRouteById(routeId);
    window.location.hash = nextRoute.path;
  }, []);

  return {
    route,
    path,
    navigate
  };
}
