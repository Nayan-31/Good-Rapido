import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, MetricCard, ProgressBar } from "@good-rapido/ui";

import { findOpsRouteById } from "@/routes";
import { communicationsService } from "./communications.service";
import type {
  CommunicationFormState,
  NotificationDashboard,
  NotificationDetail,
  NotificationItem,
  NotificationList,
  NotificationSummary,
  SupportSummary,
  SupportTicket
} from "./communications.types";
import styles from "./CommunicationsScreen.module.css";

const route = findOpsRouteById("communications");

const emptyNotificationSummary: NotificationSummary = {
  totalNotifications: 0,
  unreadCount: 0,
  readCount: 0,
  archivedCount: 0,
  urgentCount: 0,
  scheduledCount: 0,
  sentCount: 0,
  failedCount: 0,
  byType: {},
  byCategory: {},
  byChannel: {}
};

const emptySupportSummary: SupportSummary = {
  totalTickets: 0,
  openCount: 0,
  resolvedCount: 0,
  closedCount: 0,
  urgentCount: 0,
  byStatus: {},
  byCategory: {},
  latestActivityAt: null
};

const initialForm: CommunicationFormState = {
  audienceMode: "single",
  authUserId: "ops-demo-rider",
  role: "rider",
  type: "safety_alert",
  category: "safety",
  priority: "urgent",
  channel: "push",
  title: "Safety team is monitoring your ride",
  message: "Your trip is being watched by Good Rapido safety support until the route is back to normal.",
  actionLabel: "Open Safety",
  actionUrl: "/safety",
  relatedEntityType: "ride",
  relatedEntityId: "ride-demo-001",
  relatedEntityCode: "RD-DEMO-001"
};

export function CommunicationsScreen() {
  const [dashboard, setDashboard] = useState<NotificationDashboard | null>(null);
  const [notificationList, setNotificationList] = useState<NotificationList | null>(null);
  const [supportSummary, setSupportSummary] = useState<SupportSummary>(emptySupportSummary);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<NotificationDetail | null>(null);
  const [form, setForm] = useState<CommunicationFormState>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCommunications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await communicationsService.load();
      setDashboard(data.notificationDashboard ?? null);
      setNotificationList(data.notificationList ?? null);
      setSupportSummary(data.supportSummary ?? data.supportTickets?.summary ?? emptySupportSummary);
      setSupportTickets(data.supportTickets?.tickets ?? []);
    } catch (caughtError) {
      setError(resolveErrorMessage(caughtError));
      setDashboard(null);
      setNotificationList(null);
      setSupportSummary(emptySupportSummary);
      setSupportTickets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCommunications();
  }, [loadCommunications]);

  const summary = dashboard?.summary ?? notificationList?.summary ?? emptyNotificationSummary;
  const notifications = useMemo(() => {
    const listed = notificationList?.notifications ?? [];

    if (listed.length) {
      return listed;
    }

    return dashboard?.recentNotifications ?? [];
  }, [dashboard?.recentNotifications, notificationList?.notifications]);

  const deliveryHealth = summary.totalNotifications
    ? Math.round((summary.sentCount / summary.totalNotifications) * 100)
    : 0;

  const runAction = async (actionName: string, action: () => Promise<unknown>, successMessage: string) => {
    setPendingAction(actionName);
    setMessage(null);
    setError(null);

    try {
      await action();
      setMessage(successMessage);
      await loadCommunications();
    } catch (caughtError) {
      setError(resolveErrorMessage(caughtError));
    } finally {
      setPendingAction(null);
    }
  };

  const openNotification = async (notification: NotificationItem) => {
    await runAction(`open:${notification.id}`, async () => {
      const detail = await communicationsService.getNotification(notification.id);
      setSelectedNotification(detail ?? null);
    }, `Opened ${notification.notificationCode || notification.title || notification.id}`);
  };

  const updateForm = (field: keyof CommunicationFormState, value: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  };

  return (
    <section className={styles.screen}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Communications</span>
          <h1>Operate notifications, delivery retries, support handoffs, and incident broadcasts</h1>
          <p>Connected with {route.backendModules.join(", ")} for notification list, create/send/retry/fail/cancel actions, support load, and incident broadcasts.</p>
        </div>
        <div className={styles.heroActions}>
          <Button type="button" onClick={() => void loadCommunications()} isLoading={isLoading}>Refresh Comms</Button>
          <Badge tone={error ? "danger" : "trust"}>{error ? "Needs auth/data" : "Backend wired"}</Badge>
        </div>
      </section>

      <section className={styles.metrics}>
        <MetricCard label="Notifications" value={String(summary.totalNotifications)} meta={`${summary.unreadCount} unread`} tone="navy" />
        <MetricCard label="Delivery Health" value={`${deliveryHealth}%`} meta={`${summary.sentCount} sent`} tone="success" />
        <MetricCard label="Failed" value={String(summary.failedCount)} meta="retry queue" tone="danger" />
        <MetricCard label="Support Open" value={String(supportSummary.openCount)} meta={`${supportSummary.urgentCount} urgent`} tone="warning" />
      </section>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}
      {message ? <div className={styles.successBanner}>{message}</div> : null}

      <section className={styles.workspace}>
        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Notification List</span>
              <h2>Delivery operations</h2>
            </div>
            <Badge tone="navy">{notifications.length} messages</Badge>
          </div>

          <div className={styles.queue}>
            {notifications.map((notification) => (
              <button type="button" className={styles.queueItem} key={notification.id} onClick={() => void openNotification(notification)}>
                <span>{notification.notificationCode || formatLabel(notification.type)}</span>
                <strong>{notification.title || notification.id}</strong>
                <small>{notification.guidance.nextAction}</small>
                <div className={styles.queueMeta}>
                  <Badge tone={toneForPriority(notification.priority)}>{formatLabel(notification.priority)}</Badge>
                  <Badge tone={toneForDelivery(notification.deliveryStatus)}>{formatLabel(notification.deliveryStatus)}</Badge>
                </div>
              </button>
            ))}
            {!notifications.length ? <p>No notifications found.</p> : null}
          </div>
        </Card>

        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Support Ticket Summary</span>
              <h2>Support load and handoffs</h2>
            </div>
            <Badge tone={supportSummary.urgentCount ? "danger" : "trust"}>{supportSummary.totalTickets} tickets</Badge>
          </div>

          <div className={styles.supportGrid}>
            <div><span>Open</span><strong>{supportSummary.openCount}</strong></div>
            <div><span>Resolved</span><strong>{supportSummary.resolvedCount}</strong></div>
            <div><span>Closed</span><strong>{supportSummary.closedCount}</strong></div>
            <div><span>Urgent</span><strong>{supportSummary.urgentCount}</strong></div>
          </div>

          <div className={styles.queue}>
            {supportTickets.map((ticket) => (
              <article className={styles.ticketItem} key={ticket.id}>
                <span>{ticket.ticketCode || formatLabel(ticket.category)}</span>
                <strong>{ticket.subject || ticket.id}</strong>
                <small>{formatLabel(ticket.status)} - {ticket.messageCount} messages - {ticket.attachmentCount} files</small>
              </article>
            ))}
            {!supportTickets.length ? <p>No support tickets found.</p> : null}
          </div>
        </Card>
      </section>

      <section className={styles.actionGrid}>
        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Create Notification</span>
              <h2>Targeted ops message</h2>
            </div>
            <Badge tone="trust">{form.audienceMode}</Badge>
          </div>

          <NotificationForm form={form} onChange={updateForm} />

          <div className={styles.actions}>
            <Button
              type="button"
              isLoading={pendingAction === "create"}
              onClick={() => void runAction("create", () => communicationsService.createNotification(form), "Notification created")}
            >
              Create Notification
            </Button>
            <Button
              type="button"
              variant="mint"
              isLoading={pendingAction === "broadcast"}
              onClick={() => void runAction("broadcast", () => communicationsService.broadcastIncident(form), "Incident broadcast created")}
            >
              Incident Broadcast
            </Button>
          </div>
        </Card>

        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Notification Detail</span>
              <h2>{selectedNotification?.notificationCode || "Select a message"}</h2>
            </div>
            <Badge tone={toneForDelivery(selectedNotification?.deliveryStatus)}>{formatLabel(selectedNotification?.deliveryStatus)}</Badge>
          </div>

          {selectedNotification ? (
            <>
              <div className={styles.detail}>
                <strong>{selectedNotification.title}</strong>
                <p>{selectedNotification.message}</p>
                <span>{formatLabel(selectedNotification.type)} to {formatLabel(selectedNotification.role)} via {formatLabel(selectedNotification.channel)}</span>
              </div>

              <div className={styles.actions}>
                <Button
                  type="button"
                  disabled={!selectedNotification.guidance.canSend}
                  isLoading={pendingAction === "send"}
                  onClick={() => void runAction("send", () => communicationsService.sendNotification(selectedNotification.id), "Notification sent")}
                >
                  Send
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!selectedNotification.guidance.canRetry}
                  isLoading={pendingAction === "retry"}
                  onClick={() => void runAction("retry", () => communicationsService.retryNotification(selectedNotification.id), "Notification retry queued")}
                >
                  Retry
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  isLoading={pendingAction === "fail"}
                  onClick={() => void runAction("fail", () => communicationsService.failNotification(selectedNotification.id), "Notification marked failed")}
                >
                  Fail
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!selectedNotification.guidance.canCancel}
                  isLoading={pendingAction === "cancel"}
                  onClick={() => void runAction("cancel", () => communicationsService.cancelNotification(selectedNotification.id), "Notification cancelled")}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className={styles.emptyDetail}>
              <ProgressBar value={deliveryHealth} label="Delivery health from private notifications" showValue tone="trust" />
              <p>Open a notification to review its exact message, delivery status, and available action controls.</p>
            </div>
          )}
        </Card>
      </section>

      <Card padding="lg" className={styles.incidentPanel}>
        <div>
          <span className={styles.eyebrow}>Incident Broadcast UI</span>
          <h2>Safety and service disruption template</h2>
          <p>Uses the same private notification create endpoint with multi-recipient payloads, urgent priority, safety category, and support handoff metadata.</p>
        </div>
        <div className={styles.incidentPreview}>
          <strong>{form.title}</strong>
          <span>{form.message}</span>
        </div>
      </Card>
    </section>
  );
}

function NotificationForm({
  form,
  onChange
}: {
  form: CommunicationFormState;
  onChange: (field: keyof CommunicationFormState, value: string) => void;
}) {
  return (
    <div className={styles.form}>
      <label className={styles.field}>
        <span>Audience</span>
        <select value={form.audienceMode} onChange={(event) => onChange("audienceMode", event.target.value)}>
          <option value="single">Single recipient</option>
          <option value="broadcast">Broadcast sample</option>
        </select>
      </label>
      <label className={styles.field}>
        <span>Auth User Id</span>
        <input value={form.authUserId} onChange={(event) => onChange("authUserId", event.target.value)} />
      </label>
      <label className={styles.field}>
        <span>Role</span>
        <select value={form.role} onChange={(event) => onChange("role", event.target.value)}>
          <option value="rider">Rider</option>
          <option value="passenger">Passenger</option>
        </select>
      </label>
      <label className={styles.field}>
        <span>Type</span>
        <select value={form.type} onChange={(event) => onChange("type", event.target.value)}>
          <option value="safety_alert">Safety alert</option>
          <option value="ride_alert">Ride alert</option>
          <option value="payment_update">Payment update</option>
          <option value="dispute_update">Dispute update</option>
          <option value="system">System notice</option>
        </select>
      </label>
      <label className={styles.field}>
        <span>Category</span>
        <select value={form.category} onChange={(event) => onChange("category", event.target.value)}>
          <option value="safety">Safety</option>
          <option value="rides">Rides</option>
          <option value="payments">Payments</option>
          <option value="disputes">Disputes</option>
          <option value="system">System</option>
        </select>
      </label>
      <label className={styles.field}>
        <span>Priority</span>
        <select value={form.priority} onChange={(event) => onChange("priority", event.target.value)}>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </label>
      <label className={styles.field}>
        <span>Channel</span>
        <select value={form.channel} onChange={(event) => onChange("channel", event.target.value)}>
          <option value="push">Push</option>
          <option value="in_app">In app</option>
          <option value="sms">SMS</option>
          <option value="email">Email</option>
        </select>
      </label>
      <label className={styles.field}>
        <span>Title</span>
        <input value={form.title} onChange={(event) => onChange("title", event.target.value)} />
      </label>
      <label className={`${styles.field} ${styles.fullWidth}`}>
        <span>Message</span>
        <textarea value={form.message} onChange={(event) => onChange("message", event.target.value)} />
      </label>
      <label className={styles.field}>
        <span>Action Label</span>
        <input value={form.actionLabel} onChange={(event) => onChange("actionLabel", event.target.value)} />
      </label>
      <label className={styles.field}>
        <span>Action URL</span>
        <input value={form.actionUrl} onChange={(event) => onChange("actionUrl", event.target.value)} />
      </label>
      <label className={styles.field}>
        <span>Entity Type</span>
        <select value={form.relatedEntityType} onChange={(event) => onChange("relatedEntityType", event.target.value)}>
          <option value="ride">Ride</option>
          <option value="payment">Payment</option>
          <option value="dispute">Dispute</option>
          <option value="system">System</option>
        </select>
      </label>
      <label className={styles.field}>
        <span>Entity Id</span>
        <input value={form.relatedEntityId} onChange={(event) => onChange("relatedEntityId", event.target.value)} />
      </label>
      <label className={styles.field}>
        <span>Entity Code</span>
        <input value={form.relatedEntityCode} onChange={(event) => onChange("relatedEntityCode", event.target.value)} />
      </label>
    </div>
  );
}

const formatLabel = (value: string | null | undefined) =>
  (value || "not_available").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const toneForPriority = (priority: string | null | undefined) => {
  if (priority === "urgent") {
    return "danger";
  }

  if (priority === "high") {
    return "warning";
  }

  return "trust";
};

const toneForDelivery = (deliveryStatus: string | null | undefined) => {
  if (deliveryStatus === "failed") {
    return "danger";
  }

  if (deliveryStatus === "pending" || deliveryStatus === "scheduled") {
    return "warning";
  }

  if (deliveryStatus === "sent" || deliveryStatus === "read") {
    return "success";
  }

  return "neutral";
};

const resolveErrorMessage = (caughtError: unknown) => {
  if (caughtError instanceof Error) {
    return caughtError.message;
  }

  return "Communications data could not be loaded";
};
