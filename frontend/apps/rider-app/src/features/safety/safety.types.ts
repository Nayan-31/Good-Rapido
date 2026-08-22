export interface SupportSummary {
  totalTickets: number;
  openCount: number;
  resolvedCount: number;
  closedCount: number;
  urgentCount: number;
  latestActivityAt: string | null;
}

export interface CurrentRide {
  id: string;
  status: string;
  bookingCode?: string | null;
}

export interface SafetyTicket {
  id: string;
  ticketCode: string;
  category?: string | null;
  status: string;
  priority: string;
  subject: string | null;
  messageCount?: number;
  latestActivityAt: string | null;
}

export interface SafetyContactResponse {
  ticket?: SafetyTicket;
}
