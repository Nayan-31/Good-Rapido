import { RiderAppShell } from "@/layouts";
import { useRiderRouter } from "@/routes";
import { AuthGate, useAuthSession } from "@/features/auth";
import { RiderRouteOutlet } from "./RiderRouteOutlet";

export function App() {
  const { route, navigate } = useRiderRouter();
  const { isAuthenticated, signIn, register, signOut } = useAuthSession();

  if (!isAuthenticated) {
    return <AuthGate onSignIn={signIn} onRegister={register} />;
  }

  return (
    <RiderAppShell activeRoute={route} onNavigate={navigate} onSignOut={signOut}>
      <RiderRouteOutlet route={route} />
    </RiderAppShell>
  );
}
