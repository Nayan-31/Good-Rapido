import type { ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type {
  DisputeDashboard,
  DisputeDetail,
  DisputeQueue,
  FraudCase,
  FraudCaseList,
  FraudDashboard,
  FraudSimulation
} from "./fraudDisputes.types";

type FraudDashboardResponse = ApiResponse<{ dashboard: FraudDashboard }>;
type FraudListResponse = ApiResponse<{ fraud: FraudCaseList }>;
type FraudCaseResponse = ApiResponse<{ case: FraudCase }>;
type FraudSimulationResponse = ApiResponse<FraudSimulation>;
type DisputeDashboardResponse = ApiResponse<{ dashboard: DisputeDashboard }>;
type DisputeQueueResponse = ApiResponse<{ disputes: DisputeQueue }>;
type DisputeDetailResponse = ApiResponse<{ dispute: DisputeDetail }>;

export const fraudDisputesService = {
  async load() {
    const [fraudDashboard, fraudCases, disputeDashboard, disputes] = await Promise.all([
      apiClient.private.fraud.getDashboard() as Promise<FraudDashboardResponse>,
      apiClient.private.fraud.listCases({ limit: 50 }) as Promise<FraudListResponse>,
      apiClient.private.disputes.getDashboard() as Promise<DisputeDashboardResponse>,
      apiClient.private.disputes.getQueue({ limit: 50 }) as Promise<DisputeQueueResponse>
    ]);

    return {
      fraudDashboard: fraudDashboard.data?.dashboard,
      fraudCases: fraudCases.data?.fraud,
      disputeDashboard: disputeDashboard.data?.dashboard,
      disputes: disputes.data?.disputes
    };
  },

  async getFraudCase(caseId: string) {
    const response = await apiClient.private.fraud.getCase(caseId) as FraudCaseResponse;

    return response.data?.case;
  },

  async assignFraudCase(caseId: string, reviewerId: string, note: string) {
    const response = await apiClient.private.fraud.assignReviewer(caseId, {
      assignedReviewerId: reviewerId,
      note
    }) as FraudCaseResponse;

    return response.data?.case;
  },

  async confirmFraudCase(caseId: string, note: string) {
    const response = await apiClient.private.fraud.confirmCase(caseId, {
      actions: {
        accountBlocked: true,
        payoutHeld: true,
        reason: "Confirmed by ops dashboard investigation"
      },
      note
    }) as FraudCaseResponse;

    return response.data?.case;
  },

  async dismissFraudCase(caseId: string, note: string) {
    const response = await apiClient.private.fraud.dismissCase(caseId, { note }) as FraudCaseResponse;

    return response.data?.case;
  },

  async resolveFraudCase(caseId: string, note: string) {
    const response = await apiClient.private.fraud.resolveCase(caseId, {
      decision: "confirmed_fraud",
      actions: {
        accountBlocked: true,
        payoutHeld: true,
        reason: "Resolved from ops dashboard"
      },
      note
    }) as FraudCaseResponse;

    return response.data?.case;
  },

  async simulateRisk() {
    const response = await apiClient.private.fraud.simulate({
      caseType: "fake_trip",
      signals: {
        gpsMismatchScore: 88,
        paymentRiskScore: 62,
        deviceReuseScore: 72,
        disputePatternScore: 58
      }
    }) as FraudSimulationResponse;

    return response.data;
  },

  async getDispute(disputeId: string) {
    const response = await apiClient.private.disputes.getDispute(disputeId) as DisputeDetailResponse;

    return response.data?.dispute;
  },

  assignDispute(disputeId: string, opsUserId: string, note: string) {
    return apiClient.private.disputes.assign(disputeId, { assignedOpsUserId: opsUserId, note });
  },

  requestEvidence(disputeId: string, note: string) {
    return apiClient.private.disputes.requestEvidence(disputeId, { note });
  },

  resolveDispute(disputeId: string, note: string, refundAmount: number) {
    return apiClient.private.disputes.resolve(disputeId, {
      resolutionType: "refund_approved",
      refundAmount,
      note
    });
  },

  rejectDispute(disputeId: string, note: string) {
    return apiClient.private.disputes.reject(disputeId, { note });
  }
};
