import type { ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type { SafetyContactResponse, SafetyTicket, SupportSummary } from "./safety.types";

type SupportSummaryResponse = ApiResponse<{
  summary: SupportSummary;
}>;

type SupportTicketListResponse = ApiResponse<{
  tickets: SafetyTicket[];
  summary: SupportSummary;
}>;

type CurrentRideResponse = ApiResponse<{
  ride: unknown;
}>;

type SafetySupportResponse = ApiResponse<SafetyContactResponse>;

export const safetyService = {
  getSupportSummary() {
    return apiClient.public.support.getSummary() as Promise<SupportSummaryResponse>;
  },
  listSupportTickets() {
    return apiClient.public.support.listTickets({ limit: 6 }) as Promise<SupportTicketListResponse>;
  },
  getCurrentRide() {
    return apiClient.public.rides.getCurrent() as Promise<CurrentRideResponse>;
  },
  contactSafetySupport({
    rideId,
    subject,
    message,
    urgent = false
  }: {
    rideId?: string | null;
    subject: string;
    message: string;
    urgent?: boolean;
  }) {
    return apiClient.public.support.createTicket({
      category: "safety",
      subject,
      description: message,
      priority: urgent ? "urgent" : "high",
      channel: urgent ? "phone" : "chat",
      contactMethod: "in_app",
      relatedEntity: rideId
        ? {
            type: "ride",
            id: rideId
          }
        : undefined,
      attachments: [
        {
          type: "text_note",
          label: "Rider safety note",
          note: message,
          capturedAt: new Date().toISOString()
        }
      ]
    }) as Promise<SafetySupportResponse>;
  }
};
