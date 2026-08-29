import { useEffect } from "react";
import { useState } from "react";

import { consumeOpsAuthNotice, OPS_AUTH_SESSION_CHANGED_EVENT, useOpsAuthSession } from "@/features/auth";
import { OpsAppShell } from "@/layouts";
import { authedDefaultOpsRoute, findOpsRouteById, useOpsRouter } from "@/routes";
import { OpsRouteOutlet } from "./OpsRouteOutlet";

export function App() {
  const { route, navigate } = useOpsRouter();
  const auth = useOpsAuthSession();
  const activeRoute = auth.isAuthenticated ? route : findOpsRouteById("auth");
  const [authNotice, setAuthNotice] = useState<string | null>(() => consumeOpsAuthNotice());

  useEffect(() => {
    const syncAuthNotice = () => {
      setAuthNotice((currentNotice) => consumeOpsAuthNotice() ?? currentNotice);
    };

    window.addEventListener(OPS_AUTH_SESSION_CHANGED_EVENT, syncAuthNotice);

    return () => window.removeEventListener(OPS_AUTH_SESSION_CHANGED_EVENT, syncAuthNotice);
  }, []);

  useEffect(() => {
    if (auth.isAuthenticated && route.id === "auth") {
      navigate(authedDefaultOpsRoute.id);
    }

    if (!auth.isAuthenticated && route.id !== "auth") {
      setAuthNotice((currentNotice) => currentNotice ?? "Please sign in as admin or ops to continue.");
      navigate("auth");
    }
  }, [auth.isAuthenticated, navigate, route.id]);

  const handleSignOut = async () => {
    await auth.signOut();
    setAuthNotice(consumeOpsAuthNotice() ?? "You have been signed out safely.");
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
          onSignIn: auth.signIn,
          notice: authNotice,
          onNoticeDismiss: () => setAuthNotice(null)
        }}
      />
    </OpsAppShell>
  );
}
