import { Alert, Badge, Button } from "@good-rapido/ui";

import { useDriverNotifications } from "./useDriverNotifications";
import type { DriverNotificationItem } from "./notifications.types";
import styles from "./NotificationsScreen.module.css";

export function NotificationsScreen() {
  const notifications = useDriverNotifications();
  const view = notifications.view;
  const selected = notifications.selectedNotification;

  return (
    <section className={styles.screen}>
      <section className={styles.hero}>
        <div>
          <Badge tone="info">Step 08</Badge>
          <h1>Driver notifications</h1>
          <p>Review ride alerts, payout updates, document reminders, notification details, and read state from one inbox.</p>
        </div>
        <Button type="button" variant="secondary" isLoading={notifications.isLoading} onClick={() => void notifications.reload()}>
          Refresh inbox
        </Button>
      </section>

      {notifications.error ? (
        <Alert tone="danger" title="Notifications failed">
          {notifications.error}
        </Alert>
      ) : null}
      {notifications.message ? (
        <Alert tone="trust" title="Inbox update">
          {notifications.message}
        </Alert>
      ) : null}
      {view.backendNote ? (
        <Alert tone="info" title="Backend integration note">
          {view.backendNote}
        </Alert>
      ) : null}

      <section className={styles.summaryGrid}>
        <SummaryCard label="Total" value={view.summary.total} />
        <SummaryCard label="Unread" value={view.summary.unread} />
        <SummaryCard label="Urgent" value={view.summary.urgent} />
        <SummaryCard label="Ride alerts" value={view.summary.rideAlerts} />
      </section>

      <section className={styles.layout}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Inbox</span>
              <h2>Priority alerts</h2>
            </div>
            <Badge tone={view.summary.unread ? "warning" : "success"}>{view.summary.unread} unread</Badge>
          </div>
          <div className={styles.notificationList}>
            {view.notifications.length ? (
              view.notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  active={selected?.id === notification.id}
                  notification={notification}
                  onSelect={notifications.selectNotification}
                />
              ))
            ) : (
              <Alert tone="neutral" title="No notifications yet">
                Ride alerts, payout updates, document reminders, and support messages will appear here.
              </Alert>
            )}
          </div>
        </article>

        <article className={styles.detailPanel}>
          {selected ? (
            <>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>Notification detail</span>
                  <h2>{selected.title}</h2>
                </div>
                <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
              </div>
              <p>{selected.message}</p>
              <div className={styles.detailMeta}>
                <div>
                  <span>Category</span>
                  <strong>{formatStatus(selected.category)}</strong>
                </div>
                <div>
                  <span>Priority</span>
                  <strong>{selected.priority}</strong>
                </div>
                <div>
                  <span>Channel</span>
                  <strong>{formatStatus(selected.channel)}</strong>
                </div>
              </div>
              <div className={styles.detailActions}>
                <Button
                  type="button"
                  variant="mint"
                  disabled={selected.status === "read"}
                  isLoading={notifications.isSaving}
                  onClick={() => void notifications.markSelectedRead()}
                >
                  Mark read
                </Button>
                <Button type="button" variant="secondary">
                  {selected.actionLabel}
                </Button>
              </div>
            </>
          ) : (
            <Alert tone="neutral" title="No notification selected">
              Select an inbox item to review its detail.
            </Alert>
          )}
        </article>
      </section>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className={styles.summaryCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

interface NotificationRowProps {
  active: boolean;
  notification: DriverNotificationItem;
  onSelect: (notificationId: string) => void;
}

function NotificationRow({ active, notification, onSelect }: NotificationRowProps) {
  return (
    <button
      className={styles.notificationRow}
      data-active={active}
      type="button"
      onClick={() => onSelect(notification.id)}
    >
      <div>
        <span>{notification.notificationCode}</span>
        <strong>{notification.title}</strong>
        <small>{notification.createdAt}</small>
      </div>
      <Badge tone={notification.status === "unread" ? "warning" : "neutral"}>{notification.status}</Badge>
    </button>
  );
}

const statusTone = (status: DriverNotificationItem["status"]) => {
  if (status === "unread") {
    return "warning";
  }

  if (status === "archived") {
    return "neutral";
  }

  return "success";
};

const formatStatus = (value: string) => value.replace(/_/g, " ");
