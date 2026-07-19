export interface DriverNotificationItem {
  id: string;
  notificationCode: string;
  title: string;
  message: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "unread" | "read" | "archived";
  channel: string;
  createdAt: string;
  actionLabel: string;
}

export interface DriverNotificationsView {
  notifications: DriverNotificationItem[];
  selectedNotificationId: string;
  summary: {
    total: number;
    unread: number;
    urgent: number;
    rideAlerts: number;
  };
  backendNote: string | null;
}
