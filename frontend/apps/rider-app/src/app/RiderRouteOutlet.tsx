import { BookingHomeScreen } from "@/features/booking";
import { IdentityFlow } from "@/features/identity";
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

  return null;
}
