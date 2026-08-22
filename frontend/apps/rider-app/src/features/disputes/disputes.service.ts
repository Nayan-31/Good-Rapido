import type { ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type { RiderDisputeForm, RiderDisputeItem, RiderDisputeRide, RiderDisputeSummary } from "./disputes.types";

type DisputeSummaryResponse = ApiResponse<{
  summary?: RiderDisputeSummary;
}>;

type DisputeHistoryResponse = ApiResponse<{
  history?: RiderDisputeItem[];
  summary?: RiderDisputeSummary;
}>;

type RideHistoryResponse = ApiResponse<{
  history?: RiderDisputeRide[];
}>;

type DisputeActionResponse = ApiResponse<{
  dispute?: RiderDisputeItem;
}>;

export const defaultDisputeForm: RiderDisputeForm = {
  rideId: "",
  type: "fare_overcharge",
  reason: "fare_higher_than_quote",
  title: "Fare needs review",
  description: "The final fare looks different from the transparent estimate. Please review the ride and fare signals.",
  requestedResolution: "fare_adjustment",
  requestedRefundAmount: "50",
  evidenceNote: "Fare estimate and final receipt do not match clearly."
};

export const emptyDisputeSummary: RiderDisputeSummary = {
  totalDisputes: 0,
  openCount: 0,
  resolvedCount: 0,
  cancelledCount: 0,
  urgentCount: 0,
  latestSubmittedAt: null
};

export const disputesService = {
  async load() {
    const [summaryResponse, historyResponse, rideResponse] = await Promise.all([
      apiClient.public.disputes.getSummary() as Promise<DisputeSummaryResponse>,
      apiClient.public.disputes.getHistory({ limit: 12 }) as Promise<DisputeHistoryResponse>,
      apiClient.public.rides.getHistory({ status: "completed", limit: 8 }) as Promise<RideHistoryResponse>
    ]);

    return {
      summary: historyResponse.data?.summary ?? summaryResponse.data?.summary ?? emptyDisputeSummary,
      disputes: historyResponse.data?.history ?? [],
      rides: rideResponse.data?.history ?? []
    };
  },

  async submitDispute(form: RiderDisputeForm) {
    if (!form.rideId) {
      throw new Error("Select a completed ride before creating a dispute.");
    }

    const evidence = form.evidenceNote.trim()
      ? [{
        type: "text_note",
        label: "Rider dispute note",
        note: form.evidenceNote.trim(),
        capturedAt: new Date().toISOString()
      }]
      : [];

    return apiClient.public.disputes.submitRideDispute(form.rideId, {
      type: form.type,
      reason: form.reason,
      title: form.title,
      description: form.description,
      requestedResolution: form.requestedResolution,
      requestedRefundAmount: Number(form.requestedRefundAmount) || undefined,
      evidence
    }) as Promise<DisputeActionResponse>;
  },

  addEvidence(disputeId: string, note: string) {
    const trimmedNote = note.trim();

    if (!trimmedNote) {
      throw new Error("Add an evidence note before submitting.");
    }

    return apiClient.public.disputes.addEvidence(disputeId, {
      evidence: [{
        type: "text_note",
        label: "Additional rider evidence",
        note: trimmedNote,
        capturedAt: new Date().toISOString()
      }]
    }) as Promise<DisputeActionResponse>;
  },

  cancelDispute(disputeId: string) {
    return apiClient.public.disputes.cancelDispute(disputeId, {
      note: "Rider cancelled the dispute from the dispute center."
    }) as Promise<DisputeActionResponse>;
  }
};
