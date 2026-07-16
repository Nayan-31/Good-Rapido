import type { FareHistoryItem, RideHistoryItem, RideHistoryTransparency } from "./rideHistory.types";

export const buildRideHistoryTransparency = (
  rides: RideHistoryItem[] = [],
  fares: FareHistoryItem[] = []
): RideHistoryTransparency => {
  const completedRides = rides.filter((ride) => ride.lifecycleStatus === "completed" || ride.completedAt);
  const cancelledRides = rides.filter((ride) => ride.lifecycleStatus === "cancelled" || ride.cancelledAt);
  const totalSpend = rides.reduce((sum, ride) => sum + ride.totalFare, 0);

  return {
    rideCount: rides.length,
    totalSpend,
    averageFare: rides.length ? Math.round(totalSpend / rides.length) : 0,
    averageFairPriceScore: average(completedRides.map((ride) => ride.fairPriceScore)),
    averageRouteAccuracyScore: average(completedRides.map((ride) => ride.routeAccuracyScore)),
    cancellationCount: cancelledRides.length,
    highConfidenceFareCount: fares.filter((fare) => fare.totalFare > 0).length
  };
};

export const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};

export const formatPercent = (value: number) => `${Math.round(value)}%`;

export const getRideTitle = (ride: RideHistoryItem) =>
  `${ride.pickup.address ?? "Pickup"} to ${ride.dropoff.address ?? "Dropoff"}`;

const average = (values: number[]) => {
  const validValues = values.filter((value) => Number.isFinite(value) && value > 0);

  if (!validValues.length) {
    return 0;
  }

  return Math.round(validValues.reduce((sum, value) => sum + value, 0) / validValues.length);
};
