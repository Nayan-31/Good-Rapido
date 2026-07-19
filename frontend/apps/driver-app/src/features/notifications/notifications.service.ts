import { ApiClientError, type ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type { DriverNotificationItem, DriverNotificationsView } from "./notifications.types";

type PrivateNotificationsResponse = ApiResponse<{
  notifications?: {
    notifications?: BackendNotification[];
    summary?: Partial<DriverNotificationsView["summary"]> & {
      totalNotifications?: number;
      unreadCount?: number;
      urgentCount?: number;
    };
  };
}>;

type PublicNotificationsResponse = ApiResponse<{
  notifications?: BackendNotification[];
  summary?: {
    totalNotifications?: number;
    unreadCount?: number;
    urgentCount?: number;
  };
}>;

interface BackendNotification {
  id?: string | null;
  notificationCode?: string | null;
  title?: string | null;
  message?: string | null;
  category?: string | null;
  priority?: string | null;
  status?: string | null;
  channel?: string | null;
  actionLabel?: string | null;
  action?: {
    label?: string | null;
  };
  createdAt?: string | null;
}

export const demoNotificationsView: DriverNotificationsView = {
  notifications: [
    {
      id: "notif-001",
      notificationCode: "NTF-8101",
      title: "High demand nearby",
      message: "Salt Lake Sector V has rising ride requests. Going online now can increase your incentive eligibility.",
      category: "ride_booking",
      priority: "high",
      status: "unread",
      channel: "in_app",
      createdAt: "Today, 09:10 AM",
      actionLabel: "Open requests"
    },
    {
      id: "notif-002",
      notificationCode: "NTF-8102",
      title: "Payout ready",
      message: "Rs 2,420 is available for payout. Pending rides will settle after payment capture.",
      category: "fare_payment",
      priority: "medium",
      status: "unread",
      channel: "in_app",
      createdAt: "Today, 06:45 PM",
      actionLabel: "View earnings"
    },
    {
      id: "notif-003",
      notificationCode: "NTF-8103",
      title: "Insurance renewal reminder",
      message: "Your vehicle insurance expires soon. Upload the renewed policy to protect ride eligibility.",
      category: "account_profile",
      priority: "urgent",
      status: "read",
      channel: "in_app",
      createdAt: "Yesterday, 02:30 PM",
      actionLabel: "Open profile"
    }
  ],
  selectedNotificationId: "notif-001",
  summary: {
    total: 3,
    unread: 2,
    urgent: 1,
    rideAlerts: 1
  },
  backendNote: null
};

export const driverNotificationsService = {
  async loadNotifications(): Promise<DriverNotificationsView> {
    const notes: string[] = [];
    let notifications = demoNotificationsView.notifications;

    try {
      const response = await apiClient.private.notifications.list({
        limit: 12
      }) as PrivateNotificationsResponse;
      const backendNotifications = response.data?.notifications?.notifications ?? [];

      if (backendNotifications.length) {
        notifications = backendNotifications.map(mapNotification);
      }
    } catch (error) {
      notes.push(resolveBackendNote(error, "Private notification inbox is wired, but driver read access is not available yet."));
    }

    try {
      const response = await apiClient.public.notifications.list({
        limit: 12
      }) as PublicNotificationsResponse;

      if (response.data?.notifications?.length) {
        notifications = response.data.notifications.map(mapNotification);
      }
    } catch (error) {
      notes.push(resolveBackendNote(error, "Public notification inbox is also wired, but current driver token may not match public auth scope."));
    }

    return {
      notifications,
      selectedNotificationId: notifications[0]?.id ?? "",
      summary: buildSummary(notifications),
      backendNote: uniqueNotes(notes)
    };
  },

  async markRead(notificationId: string) {
    try {
      await apiClient.public.notifications.markRead(notificationId);
      return null;
    } catch (error) {
      return resolveBackendNote(error, "Notification was marked read locally because backend mark-read is not available for this token.");
    }
  }
};

const mapNotification = (notification: BackendNotification): DriverNotificationItem => ({
  id: notification.id || notification.notificationCode || "notification-id",
  notificationCode: notification.notificationCode || "NTF",
  title: notification.title || "Driver notification",
  message: notification.message || "No notification message available.",
  category: notification.category || "system",
  priority: mapPriority(notification.priority),
  status: mapStatus(notification.status),
  channel: notification.channel || "in_app",
  createdAt: notification.createdAt ? formatDateTime(notification.createdAt) : "Recently",
  actionLabel: notification.actionLabel || notification.action?.label || "Open"
});

const buildSummary = (notifications: DriverNotificationItem[]) => ({
  total: notifications.length,
  unread: notifications.filter((notification) => notification.status === "unread").length,
  urgent: notifications.filter((notification) => notification.priority === "urgent").length,
  rideAlerts: notifications.filter((notification) => notification.category.includes("ride")).length
});

const mapPriority = (priority: string | null | undefined): DriverNotificationItem["priority"] => {
  if (priority === "urgent" || priority === "high" || priority === "low") {
    return priority;
  }

  return "medium";
};

const mapStatus = (status: string | null | undefined): DriverNotificationItem["status"] => {
  if (status === "read" || status === "archived") {
    return status;
  }

  return "unread";
};

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

const uniqueNotes = (notes: string[]) => {
  const joinedNotes = Array.from(new Set(notes.filter(Boolean))).join(" ");
  return joinedNotes || null;
};
