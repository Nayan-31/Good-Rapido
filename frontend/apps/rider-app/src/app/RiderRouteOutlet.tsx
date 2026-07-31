import { BookingHomeScreen } from "@/features/booking";
import { RideHistoryScreen } from "@/features/history";
import { IdentityFlow } from "@/features/identity";
import { NotificationScreen } from "@/features/notifications";
import { ProfileScreen } from "@/features/profile";
import { PricingEstimateScreen } from "@/features/pricing";
import { ConfirmRideScreen, LiveRideScreen } from "@/features/ride-lifecycle";
import { SafetyScreen } from "@/features/safety";
import type { RiderRoute } from "@/routes";

export interface RiderRouteOutletProps {
  route: RiderRoute;
}

export function RiderRouteOutlet({ route }: RiderRouteOutletProps) {
  if (route.id === "home") {
    return <BookingHomeScreen />;
  }

  if (route.id === "identity") {
    return <IdentityFlow />;
  }

  if (route.id === "estimate") {
    return <PricingEstimateScreen />;
  }

  if (route.id === "confirm") {
    return <ConfirmRideScreen />;
  }

  if (route.id === "ride") {
    return <LiveRideScreen />;
  }

  if (route.id === "history") {
    return <RideHistoryScreen />;
  }

  if (route.id === "notifications") {
    return <NotificationScreen />;
  }

  if (route.id === "safety") {
    return <SafetyScreen />;
  }

  if (route.id === "profile") {
    return <ProfileScreen />;
  }

  return null;
}
