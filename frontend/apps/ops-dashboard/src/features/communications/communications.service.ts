import type { ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type {
  CommunicationFormState,
  NotificationDashboard,
  NotificationDetail,
  NotificationList,
  SupportSummary,
  SupportTicketList
} from "./communications.types";

type NotificationDashboardResponse = ApiResponse<{ dashboard: NotificationDashboard }>;
type NotificationListResponse = ApiResponse<{ notifications: NotificationList }>;
type NotificationDetailResponse = ApiResponse<{ notification: NotificationDetail }>;
type NotificationCreateResponse = ApiResponse<{ createdCount: number; notifications: NotificationDetail[] }>;
type SupportSummaryResponse = ApiResponse<{ summary: SupportSummary }>;
type SupportTicketListResponse = ApiResponse<SupportTicketList>;

export const communicationsService = {
  async load() {
    const [notificationDashboard, notificationList, supportSummary, supportTickets] = await Promise.all([
      apiClient.private.notifications.getDashboard() as Promise<NotificationDashboardResponse>,
      apiClient.private.notifications.list({ limit: 50 }) as Promise<NotificationListResponse>,
      apiClient.private.support.getSummary() as Promise<SupportSummaryResponse>,
      apiClient.private.support.listTickets({ limit: 8 }) as Promise<SupportTicketListResponse>
    ]);

    return {
      notificationDashboard: notificationDashboard.data?.dashboard,
      notificationList: notificationList.data?.notifications,
      supportSummary: supportSummary.data?.summary,
      supportTickets: supportTickets.data
    };
  },

  async getNotification(notificationId: string) {
    const response = await apiClient.private.notifications.getNotification(notificationId) as NotificationDetailResponse;

    return response.data?.notification;
  },

  async createNotification(form: CommunicationFormState) {
    const payload = buildNotificationPayload(form);
    const response = await apiClient.private.notifications.create(payload) as NotificationCreateResponse;

    return response.data;
  },

  sendNotification(notificationId: string) {
    return apiClient.private.notifications.send(notificationId);
  },

  retryNotification(notificationId: string) {
    return apiClient.private.notifications.retry(notificationId);
  },

  failNotification(notificationId: string) {
    return apiClient.private.notifications.fail(notificationId, {
      failureReason: "Ops manually marked delivery as failed for provider retry validation",
      note: "Marked from ops communications dashboard"
    });
  },

  cancelNotification(notificationId: string) {
    return apiClient.private.notifications.cancel(notificationId, {
      note: "Cancelled from ops communications dashboard"
    });
  },

  async broadcastIncident(form: CommunicationFormState) {
    const response = await apiClient.private.notifications.create({
      recipients: buildRecipients(form),
      type: "safety_alert",
      category: "safety",
      priority: "urgent",
      channel: form.channel,
      title: form.title || "Live incident update",
      message: form.message || "Ops is monitoring an active incident and will share verified updates.",
      actionLabel: "Open Safety",
      actionUrl: "/safety",
      relatedEntity: {
        type: "system",
        code: "OPS-INCIDENT"
      },
      metadata: {
        source: "ops-dashboard",
        broadcastType: "incident"
      }
    }) as NotificationCreateResponse;

    return response.data;
  }
};

const buildNotificationPayload = (form: CommunicationFormState) => {
  const relatedEntity = form.relatedEntityId || form.relatedEntityCode
    ? {
      type: form.relatedEntityType,
      id: form.relatedEntityId || undefined,
      code: form.relatedEntityCode || undefined
    }
    : undefined;

  const commonPayload = {
    type: form.type,
    category: form.category,
    priority: form.priority,
    channel: form.channel,
    title: form.title,
    message: form.message,
    actionLabel: form.actionLabel || undefined,
    actionUrl: form.actionUrl || undefined,
    relatedEntity,
    metadata: {
      source: "ops-dashboard"
    }
  };

  if (form.audienceMode === "broadcast") {
    return {
      ...commonPayload,
      recipients: buildRecipients(form)
    };
  }

  const authUserId = form.authUserId.trim();

  if (!authUserId) {
    throw new Error("Auth User Id is required for single recipient notifications.");
  }

  return {
    ...commonPayload,
    recipient: {
      authUserId,
      role: form.role
    }
  };
};

const buildRecipients = (form: CommunicationFormState) => {
  const recipients = form.authUserId
    .split(",")
    .map((authUserId) => authUserId.trim())
    .filter(Boolean)
    .map((authUserId) => ({
      authUserId,
      role: form.role
    }));

  if (!recipients.length) {
    throw new Error("Add one or more comma-separated Auth User Ids before broadcasting.");
  }

  return recipients;
};
