import type { ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type {
  DocumentReviewQueueItem,
  TrustDashboard,
  TrustProfile,
  TrustProfileList,
  VehicleReviewQueueItem
} from "./trustSafety.types";

type TrustDashboardResponse = ApiResponse<{ dashboard: TrustDashboard }>;
type TrustListResponse = ApiResponse<{ trust: TrustProfileList }>;
type TrustProfileResponse = ApiResponse<{ profile: TrustProfile }>;
type DocumentQueueResponse = ApiResponse<{ reviewQueue: DocumentReviewQueueItem[] }>;
type VehicleQueueResponse = ApiResponse<{ reviewQueue: VehicleReviewQueueItem[] }>;

export const trustSafetyService = {
  async load() {
    const [dashboard, profiles, documents, vehicles] = await Promise.all([
      apiClient.private.trust.getDashboard() as Promise<TrustDashboardResponse>,
      apiClient.private.trust.listProfiles({ limit: 50 }) as Promise<TrustListResponse>,
      apiClient.private.driverDocuments.getReviewQueue({ limit: 25 }) as Promise<DocumentQueueResponse>,
      apiClient.private.vehicle.getReviewQueue({ limit: 25 }) as Promise<VehicleQueueResponse>
    ]);

    return {
      dashboard: dashboard.data?.dashboard,
      profiles: profiles.data?.trust,
      documentQueue: documents.data?.reviewQueue ?? [],
      vehicleQueue: vehicles.data?.reviewQueue ?? []
    };
  },

  async getProfile(profileId: string) {
    const response = await apiClient.private.trust.getProfile(profileId) as TrustProfileResponse;

    return response.data?.profile;
  },

  async assignReviewer(profileId: string, assignedReviewerId: string, note: string) {
    const response = await apiClient.private.trust.assignReviewer(profileId, {
      assignedReviewerId,
      note
    }) as TrustProfileResponse;

    return response.data?.profile;
  },

  async addNote(profileId: string, note: string) {
    const response = await apiClient.private.trust.addNote(profileId, { note }) as TrustProfileResponse;

    return response.data?.profile;
  },

  async resolveReview(profileId: string, status: string, note: string) {
    const response = await apiClient.private.trust.resolveReview(profileId, { status, note }) as TrustProfileResponse;

    return response.data?.profile;
  },

  reviewDocument(driverId: string, documentType: string, status: string) {
    return apiClient.private.driverDocuments.reviewDocument(driverId, documentType, {
      status,
      ...(status === "rejected" ? { rejectionReason: "Document mismatch found during ops review" } : {})
    });
  },

  reviewVehicle(driverId: string, vehicleId: string, status: string) {
    return apiClient.private.vehicle.reviewVehicle(driverId, vehicleId, {
      status,
      ...(status !== "approved" ? { rejectionReason: "Vehicle compliance issue found during ops review" } : {})
    });
  }
};
