export interface NotificationSummary {
  totalNotifications: number;
  unreadCount: number;
  readCount: number;
  archivedCount: number;
  urgentCount: number;
  scheduledCount: number;
  sentCount: number;
  failedCount: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  byChannel: Record<string, number>;
}

export interface NotificationGuidance {
  canSend: boolean;
  canRetry: boolean;
  canCancel: boolean;
  nextAction: string;
}

export interface NotificationItem {
  id: string;
  notificationCode: string | null;
  authUserId: string | null;
  role: string | null;
  type: string | null;
  category: string | null;
  priority: string;
  status: string;
  deliveryStatus: string;
  channel: string;
  title: string | null;
  actionLabel: string | null;
  relatedEntity: {
    type: string | null;
    id: string | null;
    code: string | null;
  } | null;
  delivery: {
    scheduledAt: string | null;
    sentAt: string | null;
    readAt: string | null;
    archivedAt: string | null;
    failedAt: string | null;
    failureReason: string | null;
  };
  expiresAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  guidance: NotificationGuidance;
}

export interface NotificationDetail extends NotificationItem {
  message: string | null;
  actionUrl: string | null;
  metadata: Record<string, unknown>;
}

export interface NotificationDashboard {
  summary: NotificationSummary;
  urgentNotifications: NotificationItem[];
  failedNotifications: NotificationItem[];
  scheduledNotifications: NotificationItem[];
  recentNotifications: NotificationItem[];
}

export interface NotificationList {
  notifications: NotificationItem[];
  summary: NotificationSummary;
}

export interface SupportSummary {
  totalTickets: number;
  openCount: number;
  resolvedCount: number;
  closedCount: number;
  urgentCount: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  latestActivityAt: string | null;
}

export interface SupportTicket {
  id: string;
  ticketCode: string | null;
  category: string | null;
  status: string | null;
  priority: string | null;
  channel: string | null;
  subject: string | null;
  messageCount: number;
  attachmentCount: number;
  firstResponseDueAt: string | null;
  latestActivityAt: string | null;
  createdAt: string | null;
}

export interface SupportTicketList {
  tickets: SupportTicket[];
  summary: SupportSummary;
}

export interface CommunicationFormState {
  audienceMode: "single" | "broadcast";
  authUserId: string;
  role: "rider" | "passenger";
  type: string;
  category: string;
  priority: string;
  channel: string;
  title: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
  relatedEntityType: string;
  relatedEntityId: string;
  relatedEntityCode: string;
}
