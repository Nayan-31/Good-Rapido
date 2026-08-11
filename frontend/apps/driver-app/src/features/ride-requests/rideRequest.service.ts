import { ApiClientError, type ApiPayload, type ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import { saveActiveDriverRide } from "./rideRequest.storage";
import type {
  DriverActiveRideSnapshot,
  DriverRideLifecycleStatus,
  DriverRideLocation,
  DriverRideRequest,
  DriverRideRiskLevel,
  RideRequestActionResult,
  RideRequestLoadResult
} from "./rideRequest.types";

export type RideOpsQueueResponse = ApiResponse<{
  rides?: RideOpsQueueItem[];
  queue?: RideOpsQueueItem[] | {
    rides?: RideOpsQueueItem[];
  };
}>;

type RideOpsRideResponse = ApiResponse<{
  ride?: RideOpsQueueItem;
}>;

export interface RideOpsQueueItem {
  id?: string | null;
  bookingCode?: string | null;
  bookingStatus?: string | null;
  lifecycleStatus?: DriverRideLifecycleStatus | string | null;
  pickup?: Partial<DriverRideLocation> | null;
  dropoff?: Partial<DriverRideLocation> | null;
  vehicleType?: string | null;
  fare?: {
    totalFare?: number;
    distanceKm?: number;
    durationMinutes?: number;
    confidenceScore?: number;
  } | null;
  risk?: {
    cancellationRiskScore?: number;
    cancellationRiskLevel?: DriverRideRiskLevel | string | null;
    routeAccuracyScore?: number;
    fairPriceScore?: number;
  } | null;
  driver?: {
    etaMinutes?: number;
    distanceKm?: number;
  } | null;
  trustSignals?: {
    fairPriceScore?: number;
    routeFairnessScore?: number;
    routeAccuracyScore?: number;
    cancellationRiskScore?: number;
    cancellationRiskLevel?: DriverRideRiskLevel | string | null;
    detourPercentage?: number;
  } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const PENDING_REQUEST_MAX_AGE_MS = 15 * 60 * 1000;

export const demoRideRequest: DriverRideRequest = {
  id: "demo-ride-req-001",
  bookingCode: "GRD-2948",
  bookingStatus: "driver_selected",
  lifecycleStatus: "pending_confirmation",
  pickup: {
    address: "Eco Space, New Town",
    latitude: 22.5811,
    longitude: 88.4526
  },
  dropoff: {
    address: "Howrah Station Gate 2",
    latitude: 22.5831,
    longitude: 88.3429
  },
  vehicleType: "cab_economy",
  requestedAt: "2026-07-19T08:35:00.000Z",
  fare: {
    currency: "INR",
    totalFare: 342,
    driverPayout: 284,
    baseFare: 80,
    distanceFare: 186,
    timeFare: 48,
    surgeBonus: 42,
    platformFee: 14,
    distanceKm: 14.8,
    durationMinutes: 38,
    confidenceScore: 96
  },
  route: {
    pickupEtaMinutes: 5,
    pickupDistanceKm: 2.1,
    tripDistanceKm: 14.8,
    tripDurationMinutes: 38,
    routeFairnessScore: 98,
    routeAccuracyScore: 97,
    detourPercentage: 1.4,
    trafficLevel: "moderate"
  },
  rider: {
    riderName: "Amit Das",
    rating: 4.8,
    completedRides: 124,
    verificationStatus: "Verified rider",
    cancellationRiskLevel: "low",
    cancellationRiskScore: 8,
    fareConfidenceScore: 96,
    fairPriceScore: 98
  },
  transparencyNotes: [
    "Fare includes a visible peak bonus before acceptance.",
    "Pickup route is 2.1 km and expected to take 5 minutes.",
    "Rider has low cancellation risk and verified payment readiness."
  ]
};

export const rideRequestService = {
  async loadIncomingRequest(): Promise<RideRequestLoadResult> {
    const notes: string[] = [];
    let request: DriverRideRequest | null = null;

    try {
      const activeResponse = await apiClient.private.rideOps.listRides({
        status: "active",
        limit: 10
      }) as RideOpsQueueResponse;
      const activeRide = pickFirstRide(activeResponse.data);

      if (activeRide) {
        request = mapRideOpsQueueItem(activeRide);
        notes.push("An active ride is already assigned to this driver. Pending request controls are paused until the ride is completed.");
      }
    } catch (error) {
      notes.push(resolveBackendNote(error, "Active ride lookup is not available for this driver session yet."));
    }

    try {
      if (request) {
        return {
          request,
          backendNote: uniqueNotes(notes)
        };
      }

      const response = await apiClient.private.rideOps.listRides({
        status: "pending_confirmation",
        bookingStatus: "driver_selected",
        limit: 10
      }) as RideOpsQueueResponse;
      const backendRide = pickFreshPendingRide(response.data);

      if (backendRide) {
        request = mapRideOpsQueueItem(backendRide);
      } else if (shouldUseDemoRequestFallback()) {
        request = demoRideRequest;
        notes.push("No assigned backend request was found. Demo ride request fallback is enabled through VITE_USE_DEMO_RIDE_REQUESTS.");
      } else if (pickFirstRide(response.data)) {
        notes.push("Only stale pending requests were found, so they were hidden from the live driver queue.");
      }
    } catch (error) {
      notes.push(resolveBackendNote(error, "Ride ops queue is not available for this driver session yet."));

      if (shouldUseDemoRequestFallback()) {
        request = demoRideRequest;
      }
    }

    if (request?.lifecycleStatus === "pending_confirmation") {
      await Promise.allSettled([
        apiClient.core.matchingEngine.match(buildMatchingPayload(request)),
        apiClient.core.trustEngine.assess(buildRiderTrustPayload(request))
      ]).then((results) => {
        const blocked = results.some((result) => result.status === "rejected");

        if (blocked) {
          notes.push("Matching/trust engine calls are wired, but current backend guards may require ops/admin scope.");
        }
      });
    }

    return {
      request,
      backendNote: uniqueNotes(notes)
    };
  },

  async acceptRide(request: DriverRideRequest): Promise<RideRequestActionResult> {
    let activeRide = toActiveRideSnapshot(request);
    let backendNote: string | null = null;

    try {
      const response = await apiClient.private.rideOps.confirmRide(request.id, {
        note: "Driver accepted ride from driver app request screen"
      }) as RideOpsRideResponse;
      const backendRide = response.data?.ride;

      if (backendRide) {
        activeRide = toActiveRideSnapshot(mapRideOpsQueueItem(backendRide));
      }
    } catch (error) {
      backendNote = resolveBackendNote(error, "Ride was accepted locally because ride-ops confirm is not available.");
    }

    saveActiveDriverRide(activeRide);

    return {
      activeRide,
      message: "Ride accepted. Active ride is ready.",
      backendNote
    };
  },

  async declineRide(request: DriverRideRequest): Promise<RideRequestActionResult> {
    let backendNote: string | null = null;

    try {
      await apiClient.private.rideOps.cancelRide(request.id, {
        reason: "other",
        note: "Driver declined incoming request from driver app"
      });
    } catch (error) {
      backendNote = resolveBackendNote(error, "Request was declined locally because ride-ops cancel is not available.");
    }

    return {
      message: "Ride request declined.",
      backendNote
    };
  }
};

export const mapRideOpsQueueItem = (ride: RideOpsQueueItem): DriverRideRequest => {
  const totalFare = safeNumber(ride.fare?.totalFare);
  const distanceKm = safeNumber(ride.fare?.distanceKm);
  const durationMinutes = safeNumber(ride.fare?.durationMinutes);
  const confidenceScore = safeNumber(ride.fare?.confidenceScore, ride.risk?.fairPriceScore, ride.trustSignals?.fairPriceScore);

  return {
    id: ride.id || "ride-id",
    bookingCode: ride.bookingCode || "Unassigned booking",
    bookingStatus: ride.bookingStatus || "driver_selected",
    lifecycleStatus: mapLifecycleStatus(ride.lifecycleStatus),
    pickup: mapLocation(ride.pickup, "Pickup unavailable"),
    dropoff: mapLocation(ride.dropoff, "Dropoff unavailable"),
    vehicleType: ride.vehicleType || "ride",
    requestedAt: ride.createdAt || new Date().toISOString(),
    fare: {
      currency: "INR",
      totalFare,
      driverPayout: Math.max(Math.round(totalFare * 0.82), 0),
      baseFare: Math.max(Math.round(totalFare * 0.24), 0),
      distanceFare: Math.max(Math.round(totalFare * 0.54), 0),
      timeFare: Math.max(Math.round(totalFare * 0.14), 0),
      surgeBonus: Math.max(Math.round(totalFare * 0.12), 0),
      platformFee: Math.max(Math.round(totalFare * 0.04), 0),
      distanceKm,
      durationMinutes,
      confidenceScore
    },
    route: {
      pickupEtaMinutes: safeNumber(ride.driver?.etaMinutes),
      pickupDistanceKm: safeNumber(ride.driver?.distanceKm),
      tripDistanceKm: distanceKm,
      tripDurationMinutes: durationMinutes,
      routeFairnessScore: safeNumber(ride.trustSignals?.routeFairnessScore, ride.risk?.routeAccuracyScore),
      routeAccuracyScore: safeNumber(ride.risk?.routeAccuracyScore, ride.trustSignals?.routeAccuracyScore),
      detourPercentage: safeNumber(ride.trustSignals?.detourPercentage),
      trafficLevel: "normal"
    },
    rider: {
      riderName: "Rider account",
      rating: 0,
      completedRides: 0,
      verificationStatus: "Backend rider profile",
      cancellationRiskLevel: mapRiskLevel(ride.risk?.cancellationRiskLevel ?? ride.trustSignals?.cancellationRiskLevel),
      cancellationRiskScore: safeNumber(
        ride.risk?.cancellationRiskScore,
        ride.trustSignals?.cancellationRiskScore
      ),
      fareConfidenceScore: confidenceScore,
      fairPriceScore: safeNumber(ride.risk?.fairPriceScore, ride.trustSignals?.fairPriceScore)
    },
    transparencyNotes: buildTransparencyNotes({
      totalFare,
      pickupEtaMinutes: safeNumber(ride.driver?.etaMinutes),
      pickupDistanceKm: safeNumber(ride.driver?.distanceKm),
      fairPriceScore: safeNumber(ride.risk?.fairPriceScore, ride.trustSignals?.fairPriceScore)
    })
  };
};

export const toActiveRideSnapshot = (request: DriverRideRequest): DriverActiveRideSnapshot => ({
  ...request,
  bookingStatus: "confirmed",
  lifecycleStatus: request.lifecycleStatus === "pending_confirmation" ? "driver_en_route" : request.lifecycleStatus,
  acceptedAt: new Date().toISOString(),
  timeline: {
    confirmedAt: new Date().toISOString()
  }
});

export const pickFirstRide = (data: RideOpsQueueResponse["data"]) => {
  const rides = collectRideItems(data).sort(sortNewestRide);

  return rides[0] ?? null;
};

const pickFreshPendingRide = (data: RideOpsQueueResponse["data"]) => {
  const rides = collectRideItems(data)
    .filter((ride) => isFreshPendingRequest(ride))
    .sort(sortNewestRide);

  return rides[0] ?? null;
};

const collectRideItems = (data: RideOpsQueueResponse["data"]) => {
  if (!data) {
    return [];
  }

  if (data.rides?.length) {
    return data.rides;
  }

  if (Array.isArray(data.queue)) {
    return data.queue;
  }

  return data.queue?.rides ?? [];
};

const isFreshPendingRequest = (ride: RideOpsQueueItem) => {
  const createdAt = getRideTime(ride.createdAt);

  if (!createdAt) {
    return true;
  }

  return Date.now() - createdAt <= PENDING_REQUEST_MAX_AGE_MS;
};

const sortNewestRide = (left: RideOpsQueueItem, right: RideOpsQueueItem) => (
  getRideTime(right.createdAt, right.updatedAt) - getRideTime(left.createdAt, left.updatedAt)
);

const getRideTime = (...values: Array<string | null | undefined>) => {
  const timestamp = values
    .map((value) => value ? new Date(value).getTime() : 0)
    .find((value) => Number.isFinite(value) && value > 0);

  return timestamp ?? 0;
};

const buildMatchingPayload = (request: DriverRideRequest): ApiPayload => ({
  pickup: request.pickup,
  dropoff: request.dropoff,
  vehicleType: request.vehicleType,
  serviceZone: "kolkata",
  limit: 3
});

const buildRiderTrustPayload = (request: DriverRideRequest): ApiPayload => ({
  subjectType: "rider",
  source: "metrics",
  metrics: {
    completedRides: request.rider.completedRides,
    cancelledRides: request.rider.cancellationRiskScore,
    ratingAverage: request.rider.rating
  },
  scores: {
    overall: request.rider.fareConfidenceScore,
    cancellation: 100 - request.rider.cancellationRiskScore,
    payment: request.rider.fairPriceScore
  }
});

const mapLocation = (location: Partial<DriverRideLocation> | null | undefined, fallbackAddress: string) => ({
  address: location?.address || fallbackAddress,
  latitude: safeNumber(location?.latitude),
  longitude: safeNumber(location?.longitude)
});

const buildTransparencyNotes = ({
  totalFare,
  pickupEtaMinutes,
  pickupDistanceKm,
  fairPriceScore
}: {
  totalFare: number;
  pickupEtaMinutes: number;
  pickupDistanceKm: number;
  fairPriceScore: number;
}) => [
  totalFare > 0
    ? "Fare preview comes from the locked backend fare snapshot."
    : "Fare snapshot is not available yet.",
  pickupDistanceKm > 0 || pickupEtaMinutes > 0
    ? `Pickup route is ${pickupDistanceKm} km and expected to take ${pickupEtaMinutes} minutes.`
    : "Pickup route summary is waiting for backend driver distance.",
  fairPriceScore > 0
    ? `Fair price score is ${fairPriceScore}%.`
    : "Fair price score is waiting for trust/fare signals."
];

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

  return "pending_confirmation";
};

const mapRiskLevel = (riskLevel: string | null | undefined): DriverRideRiskLevel => {
  if (riskLevel === "medium" || riskLevel === "high") {
    return riskLevel;
  }

  return "low";
};

const resolveBackendNote = (error: unknown, fallback: string) => {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
    return `${fallback} Backend returned ${error.status}; driver-facing permission is pending.`;
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

export const shouldUseDemoRequestFallback = () => import.meta.env.VITE_USE_DEMO_RIDE_REQUESTS === "true";
