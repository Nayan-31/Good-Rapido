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
import type { DriverRoute } from "@/routes";

export interface DriverRouteOutletProps {
  route: DriverRoute;
}

export function DriverRouteOutlet({ route }: DriverRouteOutletProps) {
  if (route.id === "availability") {
    return <AvailabilityScreen />;
  }

  if (route.id === "requests") {
    return <RideRequestsScreen />;
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
    return <AuthScreen />;
  }

  if (route.id === "support") {
    return <SupportScreen />;
  }

  return null;
}
