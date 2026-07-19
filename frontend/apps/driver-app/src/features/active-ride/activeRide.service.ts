import { ApiClientError, type ApiPayload, type ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import { demoRideRequest } from "@/features/ride-requests/rideRequest.service";
import { readActiveDriverRide, saveActiveDriverRide } from "@/features/ride-requests/rideRequest.storage";
import type {
  DriverActiveRideSnapshot,
  DriverRideLifecycleStatus,
  DriverRideRiskLevel
} from "@/features/ride-requests/rideRequest.types";
import type { ActiveRideActionResult, ActiveRideLoadResult, DriverLifecycleEvent } from "./activeRide.types";

type LifecycleResponse = ApiResponse<{
  lifecycle?: BackendLifecycleView;
}>;

type RoutePlanResponse = ApiResponse<{
  plan?: BackendRoutePlan;
}>;

interface BackendLifecycleView {
  lifecycleStatus?: DriverRideLifecycleStatus | string | null;
  ride?: {
    bookingStatus?: string | null;
    fare?: {
      totalFare?: number;
      distanceKm?: number;
      durationMinutes?: number;
      confidenceScore?: number;
    } | null;
    trustSignals?: {
      routeFairnessScore?: number;
      routeAccuracyScore?: number;
      detourPercentage?: number;
      fairPriceScore?: number;
      cancellationRiskScore?: number;
      cancellationRiskLevel?: string | null;
    } | null;
  } | null;
  timeline?: DriverActiveRideSnapshot["timeline"] | null;
}

interface BackendRoutePlan {
  distance?: {
    routeDistanceKm?: number;
    detourRatio?: number;
  } | null;
  duration?: {
    estimatedMinutes?: number;
  } | null;
  traffic?: {
    level?: string | null;
  } | null;
  quality?: {
    score?: number;
    routeAccuracyScore?: number;
  } | null;
}

export const activeRideService = {
  async loadActiveRide(): Promise<ActiveRideLoadResult> {
    const notes: string[] = [];
    let ride = readActiveDriverRide() ?? createDemoActiveRide();

    try {
      const lifecycleResponse = await apiClient.core.rideLifecycle.getRideLifecycle(ride.id) as LifecycleResponse;
      ride = mergeLifecycleResponse(ride, lifecycleResponse.data?.lifecycle);
    } catch (error) {
      notes.push(resolveBackendNote(error, "Ride lifecycle read is not available for this driver session yet."));
    }

    try {
      const routeResponse = await apiClient.core.routeEngine.plan(buildRoutePayload(ride)) as RoutePlanResponse;
      ride = mergeRoutePlanResponse(ride, routeResponse.data?.plan);
    } catch (error) {
      notes.push(resolveBackendNote(error, "Route engine plan is wired, but live planning is using the local route summary."));
    }

    saveActiveDriverRide(ride);

    return {
      ride,
      backendNote: uniqueNotes(notes)
    };
  },

  async transitionRide(event: DriverLifecycleEvent): Promise<ActiveRideActionResult> {
    const occurredAt = new Date().toISOString();
    const currentRide = readActiveDriverRide() ?? createDemoActiveRide();
    let ride = currentRide;
    let backendNote: string | null = null;

    try {
      const response = await apiClient.core.rideLifecycle.transitionRide(currentRide.id, {
        event,
        occurredAt,
        note: `Driver app transition: ${event}`
      }) as LifecycleResponse;
      ride = mergeLifecycleResponse(currentRide, response.data?.lifecycle);
    } catch (error) {
      backendNote = resolveBackendNote(error, "Lifecycle transition was saved locally because backend driver write access is pending.");
      ride = applyLocalTransition(currentRide, event, occurredAt);
    }

    saveActiveDriverRide(ride);

    return {
      ride,
      message: transitionMessage(ride.lifecycleStatus),
      backendNote
    };
  }
};

const createDemoActiveRide = (): DriverActiveRideSnapshot => ({
  ...demoRideRequest,
  bookingStatus: "confirmed",
  lifecycleStatus: "driver_en_route",
  acceptedAt: new Date().toISOString(),
  timeline: {
    confirmedAt: new Date().toISOString()
  }
});

const mergeLifecycleResponse = (
  ride: DriverActiveRideSnapshot,
  lifecycle: BackendLifecycleView | undefined
): DriverActiveRideSnapshot => {
  if (!lifecycle) {
    return ride;
  }

  const trustSignals = lifecycle.ride?.trustSignals;
  const fare = lifecycle.ride?.fare;

  return {
    ...ride,
    bookingStatus: lifecycle.ride?.bookingStatus || ride.bookingStatus,
    lifecycleStatus: mapLifecycleStatus(lifecycle.lifecycleStatus),
    fare: {
      ...ride.fare,
      totalFare: safeNumber(fare?.totalFare, ride.fare.totalFare),
      driverPayout: Math.max(Math.round(safeNumber(fare?.totalFare, ride.fare.totalFare) * 0.82), 0),
      distanceKm: safeNumber(fare?.distanceKm, ride.fare.distanceKm),
      durationMinutes: safeNumber(fare?.durationMinutes, ride.fare.durationMinutes),
      confidenceScore: safeNumber(fare?.confidenceScore, ride.fare.confidenceScore)
    },
    route: {
      ...ride.route,
      tripDistanceKm: safeNumber(fare?.distanceKm, ride.route.tripDistanceKm),
      tripDurationMinutes: safeNumber(fare?.durationMinutes, ride.route.tripDurationMinutes),
      routeFairnessScore: safeNumber(trustSignals?.routeFairnessScore, ride.route.routeFairnessScore),
      routeAccuracyScore: safeNumber(trustSignals?.routeAccuracyScore, ride.route.routeAccuracyScore),
      detourPercentage: safeNumber(trustSignals?.detourPercentage, ride.route.detourPercentage)
    },
    rider: {
      ...ride.rider,
      fairPriceScore: safeNumber(trustSignals?.fairPriceScore, ride.rider.fairPriceScore),
      cancellationRiskScore: safeNumber(trustSignals?.cancellationRiskScore, ride.rider.cancellationRiskScore),
      cancellationRiskLevel: mapRiskLevel(trustSignals?.cancellationRiskLevel)
    },
    timeline: {
      ...ride.timeline,
      ...(lifecycle.timeline ?? {})
    }
  };
};

const mergeRoutePlanResponse = (
  ride: DriverActiveRideSnapshot,
  plan: BackendRoutePlan | undefined
): DriverActiveRideSnapshot => {
  if (!plan) {
    return ride;
  }

  return {
    ...ride,
    route: {
      ...ride.route,
      tripDistanceKm: safeNumber(plan.distance?.routeDistanceKm, ride.route.tripDistanceKm),
      tripDurationMinutes: safeNumber(plan.duration?.estimatedMinutes, ride.route.tripDurationMinutes),
      routeFairnessScore: safeNumber(plan.quality?.score, ride.route.routeFairnessScore),
      routeAccuracyScore: safeNumber(plan.quality?.routeAccuracyScore, ride.route.routeAccuracyScore),
      detourPercentage: toDetourPercentage(plan.distance?.detourRatio, ride.route.detourPercentage),
      trafficLevel: mapTrafficLevel(plan.traffic?.level)
    }
  };
};

const applyLocalTransition = (
  ride: DriverActiveRideSnapshot,
  event: DriverLifecycleEvent,
  occurredAt: string
): DriverActiveRideSnapshot => {
  if (event === "driver_arrived") {
    return {
      ...ride,
      lifecycleStatus: "driver_arrived",
      timeline: {
        ...ride.timeline,
        driverArrivedAt: occurredAt
      }
    };
  }

  if (event === "ride_started") {
    return {
      ...ride,
      lifecycleStatus: "in_progress",
      timeline: {
        ...ride.timeline,
        driverArrivedAt: ride.timeline.driverArrivedAt ?? occurredAt,
        rideStartedAt: occurredAt
      }
    };
  }

  return {
    ...ride,
    lifecycleStatus: "completed",
    timeline: {
      ...ride.timeline,
      driverArrivedAt: ride.timeline.driverArrivedAt ?? occurredAt,
      rideStartedAt: ride.timeline.rideStartedAt ?? occurredAt,
      completedAt: occurredAt
    }
  };
};

const buildRoutePayload = (ride: DriverActiveRideSnapshot): ApiPayload => ({
  pickup: ride.pickup,
  dropoff: ride.dropoff,
  vehicleType: ride.vehicleType,
  routePreference: "balanced",
  serviceZone: "kolkata",
  requestedAt: new Date().toISOString()
});

const mapLifecycleStatus = (status: string | null | undefined): DriverRideLifecycleStatus => {
  if (
    status === "pending_confirmation"
    || status === "driver_en_route"
    || status === "driver_arrived"
    || status === "in_progress"
    || status === "completed"
    || status === "cancelled"
  ) {
    return status;
  }

  return "driver_en_route";
};

const mapRiskLevel = (riskLevel: string | null | undefined): DriverRideRiskLevel => {
  if (riskLevel === "medium" || riskLevel === "high") {
    return riskLevel;
  }

  return "low";
};

const mapTrafficLevel = (trafficLevel: string | null | undefined) => {
  if (trafficLevel === "heavy") {
    return "heavy";
  }

  if (trafficLevel === "moderate") {
    return "moderate";
  }

  return "normal";
};

const toDetourPercentage = (detourRatio: number | null | undefined, fallback: number) => {
  if (typeof detourRatio !== "number" || !Number.isFinite(detourRatio)) {
    return fallback;
  }

  return Math.max(Math.round((detourRatio - 1) * 1000) / 10, 0);
};

const transitionMessage = (status: DriverRideLifecycleStatus) => {
  if (status === "driver_arrived") {
    return "Arrival marked at pickup.";
  }

  if (status === "in_progress") {
    return "Ride started. Route monitoring is active.";
  }

  if (status === "completed") {
    return "Ride completed. Fare and trust signals are closed.";
  }

  return "Ride lifecycle updated.";
};

const resolveBackendNote = (error: unknown, fallback: string) => {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
    return `${fallback} Backend returned ${error.status}; driver-facing lifecycle permission is pending.`;
  }

  if (error instanceof Error) {
    return `${fallback} ${error.message}`;
  }

  return fallback;
};

const safeNumber = (...values: Array<number | null | undefined>) => {
  const value = values.find((candidate) => typeof candidate === "number" && Number.isFinite(candidate));
  return value ?? 0;
};

const uniqueNotes = (notes: string[]) => {
  const joinedNotes = Array.from(new Set(notes.filter(Boolean))).join(" ");
  return joinedNotes || null;
};
