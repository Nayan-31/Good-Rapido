import { ActiveRideScreen } from "@/features/active-ride";
import { AuthScreen } from "@/features/auth";
import { AvailabilityScreen } from "@/features/availability";
import { EarningsScreen } from "@/features/earnings";
import { NotificationsScreen } from "@/features/notifications";
import { OnboardingScreen } from "@/features/onboarding";
import { ProfileScreen } from "@/features/profile";
import { RideRequestsScreen } from "@/features/ride-requests";
import { SupportScreen } from "@/features/support";
import { TrustScreen } from "@/features/trust";
import type { DriverRoute, DriverRouteId } from "@/routes";
import type { DriverLoginForm, DriverRegisterForm } from "@/features/auth";

export interface DriverRouteOutletProps {
  route: DriverRoute;
  onNavigate?: (routeId: DriverRouteId) => void;
  auth: {
    isRestoring: boolean;
    onSignIn: (form: DriverLoginForm) => Promise<string>;
    onRegister: (form: DriverRegisterForm) => Promise<string>;
    onRestoreSession: () => Promise<string>;
    onAuthenticated: (mode: "login" | "register") => void;
  };
}

export function DriverRouteOutlet({ route, onNavigate, auth }: DriverRouteOutletProps) {
  if (route.id === "availability") {
    return <AvailabilityScreen />;
  }

  if (route.id === "requests") {
    return <RideRequestsScreen onRideAccepted={() => onNavigate?.("activeRide")} />;
  }

  if (route.id === "activeRide") {
    return <ActiveRideScreen />;
  }

  if (route.id === "earnings") {
    return <EarningsScreen />;
  }

  if (route.id === "trust") {
    return <TrustScreen />;
  }

  if (route.id === "notifications") {
    return <NotificationsScreen />;
  }

  if (route.id === "profile") {
    return <ProfileScreen />;
  }

  if (route.id === "onboarding") {
    return <OnboardingScreen />;
  }

  if (route.id === "auth") {
    return (
      <AuthScreen
        isRestoring={auth.isRestoring}
        onAuthenticated={auth.onAuthenticated}
        onRegister={auth.onRegister}
        onRestoreSession={auth.onRestoreSession}
        onSignIn={auth.onSignIn}
      />
    );
  }

  if (route.id === "support") {
    return <SupportScreen />;
  }

  return null;
}
