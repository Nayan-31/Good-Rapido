import type { ApiPayload, ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type { RideOpsDashboard, RideOpsFilters, RideOpsOptions, RideOpsQueue, RideOpsQueueItem } from "./rideOps.types";

type OptionsResponse = ApiResponse<{ options: RideOpsOptions }>;
type DashboardResponse = ApiResponse<{ dashboard: RideOpsDashboard }>;
type QueueResponse = ApiResponse<{ queue: RideOpsQueue }>;
type DetailResponse = ApiResponse<{ ride: RideOpsQueueItem }>;

export const rideOpsService = {
  async getOptions() {
    const response = await apiClient.private.rideOps.getOptions() as OptionsResponse;

    return response.data?.options;
  },

  async getDashboard() {
    const response = await apiClient.private.rideOps.getDashboard() as DashboardResponse;

    return response.data?.dashboard;
  },

  async listRides(filters: RideOpsFilters) {
    const response = await apiClient.private.rideOps.listRides({
      status: filters.status === "all" ? undefined : filters.status,
      priority: filters.priority === "all" ? undefined : filters.priority,
      issueStatus: filters.issueStatus === "all" ? undefined : filters.issueStatus,
      q: filters.query.trim() || undefined,
      limit: 50
    }) as QueueResponse;

    return response.data?.queue;
  },

  async getRide(rideId: string) {
    const response = await apiClient.private.rideOps.getRide(rideId) as DetailResponse;

    return response.data?.ride;
  },

  async updateOpsState(rideId: string, payload: ApiPayload) {
    const response = await apiClient.private.rideOps.updateOpsState(rideId, payload) as DetailResponse;

    return response.data?.ride;
  },

  async confirmRide(rideId: string, note: string) {
    const payload = note.trim().length >= 3 ? { note: note.trim() } : undefined;
    const response = await apiClient.private.rideOps.confirmRide(rideId, payload) as DetailResponse;

    return response.data?.ride;
  },

  async reassignDriver(rideId: string) {
    const response = await apiClient.private.rideOps.reassignDriver(rideId, {
      driver: {
        driverId: "drv_ops_backup_rajesh",
        fullName: "Rajesh Kumar",
        rating: 4.9,
        vehicleName: "Suzuki Dzire",
        vehicleNumber: "WB 01 AC 4522",
        vehicleColor: "White",
        etaMinutes: 4,
        distanceKm: 0.8
      },
      trustSignals: {
        driverTrustScore: 95,
        driverReliabilityScore: 97,
        routeFairnessScore: 97,
        routeAccuracyScore: 96,
        cancellationRiskScore: 7,
        cancellationRiskLevel: "low",
        cancellationRatio: 1.2,
        detourPercentage: 2,
        onTimeArrivalScore: 94,
        fairPriceScore: 96
      },
      note: "Ops reassigned ride to a verified backup driver"
    }) as DetailResponse;

    return response.data?.ride;
  },

  async cancelRide(rideId: string, reason: string, note: string) {
    const response = await apiClient.private.rideOps.cancelRide(rideId, {
      reason,
      ...(note.trim().length >= 3 ? { note: note.trim() } : {})
    }) as DetailResponse;

    return response.data?.ride;
  }
};
