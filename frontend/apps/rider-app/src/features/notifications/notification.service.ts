import type { ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type { NotificationDeliveryPlan, NotificationPreferences, NotificationSummary, RiderNotification } from "./notification.types";

type NotificationSummaryResponse = ApiResponse<{
  summary: NotificationSummary;
}>;

type NotificationPreferencesResponse = ApiResponse<{
  preferences: NotificationPreferences;
}>;

type NotificationListResponse = ApiResponse<{
  notifications?: RiderNotification[];
  history?: RiderNotification[];
  summary?: NotificationSummary;
}>;

type NotificationPlanResponse = ApiResponse<{
  plan: NotificationDeliveryPlan;
}>;

type NotificationMutationResponse = ApiResponse<{
  notification?: RiderNotification;
  preferences?: NotificationPreferences;
}>;

export const notificationService = {
  getSummary() {
    return apiClient.public.notifications.getSummary() as Promise<NotificationSummaryResponse>;
  },
  getPreferences() {
    return apiClient.public.notifications.getPreferences() as Promise<NotificationPreferencesResponse>;
  },
  list() {
    return apiClient.public.notifications.list({
      limit: 8
    }) as Promise<NotificationListResponse>;
  },
  updatePreferences(payload: Partial<Pick<NotificationPreferences, "channels" | "categories" | "quietHours">>) {
    return apiClient.public.notifications.updatePreferences(payload) as Promise<NotificationMutationResponse>;
  },
  markRead(notificationId: string) {
    return apiClient.public.notifications.markRead(notificationId) as Promise<NotificationMutationResponse>;
  },
  markAllRead() {
    return apiClient.public.notifications.markAllRead({}) as Promise<NotificationMutationResponse>;
  },
  planSafetyDelivery(preferences: NotificationPreferences | null) {
    return apiClient.core.notificationEngine.planDelivery({
      type: "safety_alert",
      category: "safety",
      priority: "urgent",
      channel: "push",
      preferences: preferences
        ? {
            channels: preferences.channels,
            categories: preferences.categories,
            quietHours: preferences.quietHours
          }
        : undefined,
      requestedAt: new Date().toISOString()
    }) as Promise<NotificationPlanResponse>;
  }
};
