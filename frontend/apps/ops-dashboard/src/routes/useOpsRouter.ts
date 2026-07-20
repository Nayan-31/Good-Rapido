import { useCallback, useEffect, useMemo, useState } from "react";

import { defaultOpsRoute, findOpsRouteById, findOpsRouteByPath, normalizeRoutePath, type OpsRouteId } from "./opsRoutes";

const readHashPath = () => {
  if (typeof window === "undefined") {
    return defaultOpsRoute.path;
  }

  return normalizeRoutePath(window.location.hash);
};

export function useOpsRouter() {
  const [path, setPath] = useState(readHashPath);

  useEffect(() => {
    const syncPath = () => setPath(readHashPath());

    window.addEventListener("hashchange", syncPath);

    if (!window.location.hash) {
      window.history.replaceState(null, "", `#${defaultOpsRoute.path}`);
      syncPath();
    }

    return () => window.removeEventListener("hashchange", syncPath);
  }, []);

  const route = useMemo(() => findOpsRouteByPath(path), [path]);

  const navigate = useCallback((routeId: OpsRouteId) => {
    window.location.hash = findOpsRouteById(routeId).path;
  }, []);

  return {
    route,
    path,
    navigate
  };
}
