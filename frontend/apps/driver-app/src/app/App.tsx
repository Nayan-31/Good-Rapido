import { useEffect } from "react";

import { DriverAppShell } from "@/layouts";
import { findDriverRouteById, useDriverRouter } from "@/routes";
import { useDriverAuthSession } from "@/features/auth";
import { DriverRouteOutlet } from "./DriverRouteOutlet";

export function App() {
  const { route, navigate } = useDriverRouter();
  const auth = useDriverAuthSession();
  const activeRoute = auth.isAuthenticated ? route : findDriverRouteById("auth");

  useEffect(() => {
    if (auth.isAuthenticated && route.id === "auth") {
      navigate("availability");
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
    <DriverAppShell
      activeRoute={activeRoute}
      isAuthenticated={auth.isAuthenticated}
      userName={auth.session?.user?.fullName}
      onNavigate={navigate}
      onSignOut={() => void handleSignOut()}
    >
      <DriverRouteOutlet
        route={activeRoute}
        auth={{
          isRestoring: auth.isRestoring,
          onSignIn: auth.signIn,
          onRegister: auth.register,
          onRestoreSession: auth.restoreSession,
          onAuthenticated: (mode) => navigate(mode === "register" ? "onboarding" : "availability")
        }}
      />
    </DriverAppShell>
  );
}
