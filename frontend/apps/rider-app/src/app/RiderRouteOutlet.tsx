import { BookingHomeScreen } from "@/features/booking";
import { IdentityFlow } from "@/features/identity";
import { NotificationScreen } from "@/features/notifications";
import { PricingEstimateScreen } from "@/features/pricing";
import { ConfirmRideScreen } from "@/features/ride-lifecycle";
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

  if (route.id === "notifications") {
    return <NotificationScreen />;
  }

  return null;
}
