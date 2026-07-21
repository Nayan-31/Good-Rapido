import { useEffect } from "react";

import { useOpsAuthSession } from "@/features/auth";
import { OpsAppShell } from "@/layouts";
import { authedDefaultOpsRoute, findOpsRouteById, useOpsRouter } from "@/routes";
import { OpsRouteOutlet } from "./OpsRouteOutlet";

export function App() {
  const { route, navigate } = useOpsRouter();
  const auth = useOpsAuthSession();
  const activeRoute = auth.isAuthenticated ? route : findOpsRouteById("auth");

  useEffect(() => {
    if (auth.isAuthenticated && route.id === "auth") {
      navigate(authedDefaultOpsRoute.id);
    }

    if (!auth.isAuthenticated && route.id !== "auth") {
      navigate("auth");
    }
  }, [auth.isAuthenticated, navigate, route.id]);

  const handleSignOut = async () => {
    await auth.signOut();
    navigate("auth");
  };

  return (
    <OpsAppShell
      activeRoute={activeRoute}
      isAuthenticated={auth.isAuthenticated}
      isRestoring={auth.isRestoring}
      session={auth.session}
      onNavigate={navigate}
      onRefreshSession={() => void auth.refreshSession()}
      onSignOut={() => void handleSignOut()}
    >
      <OpsRouteOutlet
        route={activeRoute}
        auth={{
          isRestoring: auth.isRestoring,
          onAuthenticated: () => navigate(authedDefaultOpsRoute.id),
          onRestoreSession: auth.restoreSession,
          onSignIn: auth.signIn
        }}
      />
    </OpsAppShell>
  );
}
