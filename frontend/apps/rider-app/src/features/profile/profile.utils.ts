import type { RideHistoryItem } from "@/features/history/rideHistory.types";
import type { ProfilePreferences, ProfileTransparency, RiderProfile } from "./profile.types";

export const buildProfileTransparency = (
  profile: RiderProfile | null,
  rides: RideHistoryItem[] = []
): ProfileTransparency => {
  const completedRides = rides.filter((ride) => ride.lifecycleStatus === "completed" || ride.completedAt);
  const cancelledRides = rides.filter((ride) => ride.lifecycleStatus === "cancelled" || ride.cancelledAt);

  return {
    totalRides: rides.length,
    averageFairPriceScore: average(completedRides.map((ride) => ride.fairPriceScore)),
    averageRouteAccuracyScore: average(completedRides.map((ride) => ride.routeAccuracyScore)),
    cancelledRides: cancelledRides.length,
    safetyReady: Boolean(profile?.emergencyContacts.length),
    savedAddressReady: Boolean(profile?.savedAddresses.length),
    notificationCoverage: calculateNotificationCoverage(profile?.preferences)
  };
};

export const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
};

export const getDisplayName = (profile: RiderProfile | null) => profile?.displayName || "Good Rapido Rider";

const average = (values: number[]) => {
  const validValues = values.filter((value) => Number.isFinite(value) && value > 0);

  if (!validValues.length) {
    return 0;
  }

  return Math.round(validValues.reduce((sum, value) => sum + value, 0) / validValues.length);
};

const calculateNotificationCoverage = (preferences?: ProfilePreferences) => {
  if (!preferences) {
    return 0;
  }

  const values = Object.values(preferences.notifications);
  const enabledCount = values.filter(Boolean).length;

  return Math.round((enabledCount / values.length) * 100);
};
