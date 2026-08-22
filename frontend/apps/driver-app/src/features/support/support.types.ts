export interface DriverSupportTicket {
  id: string;
  ticketCode: string;
  category: string;
  subject: string;
  status: string;
  priority: string;
  latestActivityAt: string;
  messageCount: number;
}

export interface DriverSupportForm {
  category: string;
  subject: string;
  description: string;
  priority: string;
}

export interface DriverSupportView {
  tickets: DriverSupportTicket[];
  summary: {
    open: number;
    resolved: number;
    urgent: number;
    total: number;
  };
  backendNote: string | null;
}
