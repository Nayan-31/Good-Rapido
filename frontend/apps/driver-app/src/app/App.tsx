import { useEffect } from "react";
import { useState } from "react";

import { DriverAppShell } from "@/layouts";
import { findDriverRouteById, useDriverRouter } from "@/routes";
import {
  consumeDriverAuthNotice,
  DRIVER_AUTH_SESSION_CHANGED_EVENT,
  useDriverAuthSession
} from "@/features/auth";
import { DriverRouteOutlet } from "./DriverRouteOutlet";

export function App() {
  const { route, navigate } = useDriverRouter();
  const auth = useDriverAuthSession();
  const activeRoute = auth.isAuthenticated ? route : findDriverRouteById("auth");
  const [authNotice, setAuthNotice] = useState<string | null>(() => consumeDriverAuthNotice());

  useEffect(() => {
    const syncAuthNotice = () => {
      setAuthNotice((currentNotice) => consumeDriverAuthNotice() ?? currentNotice);
    };

    window.addEventListener(DRIVER_AUTH_SESSION_CHANGED_EVENT, syncAuthNotice);

    return () => window.removeEventListener(DRIVER_AUTH_SESSION_CHANGED_EVENT, syncAuthNotice);
  }, []);

  useEffect(() => {
    if (auth.isAuthenticated && route.id === "auth") {
      navigate("availability");
    }

    if (!auth.isAuthenticated && route.id !== "auth") {
      setAuthNotice((currentNotice) => currentNotice ?? "Please login as a driver to continue.");
      navigate("auth");
    }
  }, [auth.isAuthenticated, navigate, route.id]);

  const handleSignOut = async () => {
    await auth.signOut();
    setAuthNotice(consumeDriverAuthNotice() ?? "You have been signed out safely.");
    navigate("auth");
  };

  return (
    <DriverAppShell
      activeRoute={activeRoute}
      isAuthenticated={auth.isAuthenticated}
      userName={auth.session?.user?.fullName}
      onNavigate={navigate}
      onSignOut={() => void handleSignOut()}
    >
      <DriverRouteOutlet
        route={activeRoute}
        onNavigate={navigate}
        onSignOut={() => void handleSignOut()}
        auth={{
          isRestoring: auth.isRestoring,
          onSignIn: auth.signIn,
          onRegister: auth.register,
          onRestoreSession: auth.restoreSession,
          onAuthenticated: (mode) => navigate(mode === "register" ? "onboarding" : "availability"),
          notice: authNotice,
          onNoticeDismiss: () => setAuthNotice(null)
        }}
      />
    </DriverAppShell>
  );
}
