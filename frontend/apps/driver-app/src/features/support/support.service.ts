import { ApiClientError, type ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type { DriverSupportForm, DriverSupportTicket, DriverSupportView } from "./support.types";

type SupportListResponse = ApiResponse<{
  tickets?: BackendSupportTicket[];
  summary?: {
    openCount?: number;
    resolvedCount?: number;
    urgentCount?: number;
  };
}>;

type SupportCreateResponse = ApiResponse<{
  ticket?: BackendSupportTicket;
}>;

type DisputeSummaryResponse = ApiResponse<{
  summary?: {
    openCount?: number;
    totalDisputes?: number;
  };
}>;

interface BackendSupportTicket {
  id?: string | null;
  ticketCode?: string | null;
  category?: string | null;
  subject?: string | null;
  status?: string | null;
  priority?: string | null;
  latestActivityAt?: string | null;
  createdAt?: string | null;
  messageCount?: number;
}

export const defaultSupportForm: DriverSupportForm = {
  category: "fare_payment",
  subject: "Driver payout needs review",
  description: "My ride earning or payout status looks incorrect. Please review fare and settlement signals.",
  priority: "high"
};

export const demoSupportView: DriverSupportView = {
  tickets: [
    {
      id: "ticket-001",
      ticketCode: "SUP-4012",
      category: "fare_payment",
      subject: "Peak bonus missing from payout",
      status: "waiting_for_support",
      priority: "high",
      latestActivityAt: "Today, 04:20 PM",
      messageCount: 2
    },
    {
      id: "ticket-002",
      ticketCode: "SUP-3977",
      category: "active_ride",
      subject: "Wrong pickup pin affected ETA",
      status: "resolved",
      priority: "medium",
      latestActivityAt: "Yesterday, 07:10 PM",
      messageCount: 4
    }
  ],
  summary: {
    open: 1,
    resolved: 12,
    urgent: 0,
    disputes: 1
  },
  backendNote: null
};

export const emptySupportView: DriverSupportView = {
  tickets: [],
  summary: {
    open: 0,
    resolved: 0,
    urgent: 0,
    disputes: 0
  },
  backendNote: null
};

export const driverSupportService = {
  async loadSupport(): Promise<DriverSupportView> {
    const notes: string[] = [];
    let view = emptySupportView;

    try {
      const [ticketsResponse, disputesResponse] = await Promise.all([
        apiClient.public.support.listTickets({ limit: 10 }) as Promise<SupportListResponse>,
        apiClient.public.disputes.getSummary() as Promise<DisputeSummaryResponse>
      ]);
      const tickets = ticketsResponse.data?.tickets ?? [];

      view = {
        tickets: tickets.map(mapTicket),
        summary: {
          open: safeNumber(ticketsResponse.data?.summary?.openCount, emptySupportView.summary.open),
          resolved: safeNumber(ticketsResponse.data?.summary?.resolvedCount, emptySupportView.summary.resolved),
          urgent: safeNumber(ticketsResponse.data?.summary?.urgentCount, emptySupportView.summary.urgent),
          disputes: safeNumber(disputesResponse.data?.summary?.openCount, disputesResponse.data?.summary?.totalDisputes, emptySupportView.summary.disputes)
        },
        backendNote: null
      };
    } catch (error) {
      notes.push(resolveBackendNote(error, "Support/disputes APIs are wired, but current driver token may not match public support scope."));

      if (shouldUseDemoDriverSupportFallback()) {
        view = demoSupportView;
        notes.push("Demo support fallback is enabled through VITE_USE_DEMO_DRIVER_DATA.");
      }
    }

    return {
      ...view,
      backendNote: uniqueNotes(notes)
    };
  },

  async createTicket(form: DriverSupportForm): Promise<{ ticket: DriverSupportTicket; backendNote: string | null }> {
    try {
      const response = await apiClient.public.support.createTicket({
        category: form.category,
        subject: form.subject,
        description: form.description,
        priority: form.priority,
        channel: "in_app",
        contactMethod: "in_app",
        relatedEntity: {
          type: "driver",
          code: "driver-app"
        },
        attachments: []
      }) as SupportCreateResponse;

      return {
        ticket: mapTicket(response.data?.ticket ?? {}),
        backendNote: null
      };
    } catch (error) {
      if (!shouldUseDemoDriverSupportFallback()) {
        throw new Error(resolveBackendNote(error, "Support ticket create is unavailable for this session."));
      }

      return {
        ticket: {
          id: `local-ticket-${Date.now()}`,
          ticketCode: "LOCAL-SUP",
          category: form.category,
          subject: form.subject,
          status: "waiting_for_support",
          priority: form.priority,
          latestActivityAt: "Just now",
          messageCount: 1
        },
        backendNote: resolveBackendNote(error, "Support ticket was created locally because backend ticket create is not available for this token.")
      };
    }
  }
};

const mapTicket = (ticket: BackendSupportTicket): DriverSupportTicket => ({
  id: ticket.id || ticket.ticketCode || "ticket-id",
  ticketCode: ticket.ticketCode || "SUP",
  category: ticket.category || "other",
  subject: ticket.subject || "Support ticket",
  status: ticket.status || "open",
  priority: ticket.priority || "medium",
  latestActivityAt: ticket.latestActivityAt || ticket.createdAt ? formatDateTime(ticket.latestActivityAt || ticket.createdAt || "") : "Recently",
  messageCount: safeNumber(ticket.messageCount)
});

const formatDateTime = (value: string) => new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit"
}).format(new Date(value));

const resolveBackendNote = (error: unknown, fallback: string) => {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
    return `${fallback} Backend returned ${error.status}.`;
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

const shouldUseDemoDriverSupportFallback = () => import.meta.env.VITE_USE_DEMO_DRIVER_DATA === "true";
