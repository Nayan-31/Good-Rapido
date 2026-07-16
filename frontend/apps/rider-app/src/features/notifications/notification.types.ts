export interface NotificationSummary {
  totalNotifications: number;
  unreadCount: number;
  readCount: number;
  archivedCount: number;
  urgentCount: number;
  latestNotificationAt: string | null;
}

export interface NotificationPreferences {
  channels: {
    inApp: boolean;
    push: boolean;
    sms: boolean;
    email: boolean;
  };
  categories: {
    rides: boolean;
    fares: boolean;
    payments: boolean;
    promos: boolean;
    ratings: boolean;
    disputes: boolean;
    safety: boolean;
    system: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  updatedAt: string | null;
}

export interface RiderNotification {
  id: string;
  notificationCode: string;
  type: string;
  category: string;
  priority: string;
  status: string;
  channel: string;
  title: string | null;
  message: string | null;
  actionUrl: string | null;
  readAt: string | null;
  sentAt: string | null;
  expiresAt: string | null;
  createdAt: string | null;
}

export interface NotificationDeliveryPlan {
  type: string;
  category: string;
  priority: string;
  channel: string;
  deliveryStatus: string;
  deliverNow: boolean;
  suppressed: boolean;
  suppressionReason: string;
  scheduledAt: string | null;
  sentAt: string | null;
  expiresAt: string | null;
  quietHoursActive: boolean;
  guidance: string | null;
}
