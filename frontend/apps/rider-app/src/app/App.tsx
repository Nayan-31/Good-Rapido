import { useEffect, useState } from "react";

import { RiderAppShell } from "@/layouts";
import { useRiderRouter } from "@/routes";
import { AuthGate, consumeAuthNotice, RIDER_AUTH_SESSION_CHANGED_EVENT, useAuthSession } from "@/features/auth";
import { RiderRouteOutlet } from "./RiderRouteOutlet";

export function App() {
  const { route, navigate } = useRiderRouter();
  const { isAuthenticated, signIn, register, signOut } = useAuthSession();
  const [authNotice, setAuthNotice] = useState<string | null>(() => consumeAuthNotice());

  useEffect(() => {
    const syncAuthNotice = () => {
      setAuthNotice((currentNotice) => consumeAuthNotice() ?? currentNotice);
    };

    window.addEventListener(RIDER_AUTH_SESSION_CHANGED_EVENT, syncAuthNotice);

    return () => window.removeEventListener(RIDER_AUTH_SESSION_CHANGED_EVENT, syncAuthNotice);
  }, []);

  useEffect(() => {
    if (!isAuthenticated && route.id !== "home") {
      setAuthNotice((currentNotice) => currentNotice ?? "Please sign in to open this rider page.");
    }
  }, [isAuthenticated, route.id]);

  const handleSignOut = async () => {
    await signOut();
    setAuthNotice(consumeAuthNotice() ?? "You have been signed out safely.");
  };

  if (!isAuthenticated) {
    return (
      <AuthGate
        notice={authNotice}
        onNoticeDismiss={() => setAuthNotice(null)}
        onSignIn={signIn}
        onRegister={register}
      />
    );
  }

  return (
    <RiderAppShell activeRoute={route} onNavigate={navigate} onSignOut={() => void handleSignOut()}>
      <RiderRouteOutlet route={route} />
    </RiderAppShell>
  );
}
