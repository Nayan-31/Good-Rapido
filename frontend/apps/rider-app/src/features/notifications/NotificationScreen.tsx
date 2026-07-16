import { Alert, Badge, Button, Card, MetricCard } from "@good-rapido/ui";

import type { NotificationPreferences } from "./notification.types";
import { useNotifications } from "./useNotifications";
import styles from "./NotificationScreen.module.css";

export function NotificationScreen() {
  const {
    summary,
    preferences,
    notifications,
    deliveryPlan,
    isLoading,
    isUpdating,
    message,
    loadNotifications,
    planSafetyDelivery,
    toggleChannel,
    toggleCategory,
    markRead,
    markAllRead
  } = useNotifications();

  return (
    <section className={styles.root}>
      <Card className={styles.hero} variant="navy">
        <div className={styles.heroHeader}>
          <div>
            <p className={styles.eyebrow}>Notifications</p>
            <strong>{summary?.unreadCount ?? 0}</strong>
          </div>
          <Badge tone={(summary?.urgentCount ?? 0) > 0 ? "warning" : "trust"}>{summary?.urgentCount ?? 0} urgent</Badge>
        </div>
        <div className={styles.metrics}>
          <MetricCard label="Total" value={summary?.totalNotifications ?? 0} />
          <MetricCard label="Read" value={summary?.readCount ?? 0} />
          <MetricCard label="Archived" value={summary?.archivedCount ?? 0} />
        </div>
      </Card>

      {message ? (
        <Alert tone="info" title="Notification Update">
          {message}
        </Alert>
      ) : null}

      <Card className={styles.section} variant={deliveryPlan?.suppressed ? "danger" : "mint"}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Delivery Plan</p>
            <h3>{deliveryPlan?.guidance ?? "Safety alert routing"}</h3>
          </div>
          <Badge tone={deliveryPlan?.deliverNow ? "success" : "warning"}>
            {deliveryPlan?.deliveryStatus ?? "pending"}
          </Badge>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" isLoading={isLoading} onClick={() => void loadNotifications()}>
            Refresh
          </Button>
          <Button isLoading={isUpdating} onClick={() => void planSafetyDelivery()}>
            Plan Safety Alert
          </Button>
        </div>
      </Card>

      {preferences ? (
        <Card className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Preferences</p>
              <h3>{preferences.quietHours.enabled ? "Quiet hours enabled" : "Always reachable"}</h3>
            </div>
            <Badge tone="info">{preferences.quietHours.timezone}</Badge>
          </div>
          <ToggleGroup
            items={preferences.channels}
            onToggle={(key, enabled) => void toggleChannel(key as keyof NotificationPreferences["channels"], enabled)}
          />
          <ToggleGroup
            items={preferences.categories}
            onToggle={(key, enabled) => void toggleCategory(key as keyof NotificationPreferences["categories"], enabled)}
          />
        </Card>
      ) : null}

      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Inbox</p>
            <h3>Recent alerts</h3>
          </div>
          <Button size="sm" variant="secondary" isLoading={isUpdating} onClick={() => void markAllRead()}>
            Mark All Read
          </Button>
        </div>
        <div className={styles.notificationList}>
          {notifications.map((notification) => (
            <button
              className={notification.status === "unread" ? styles.unreadNotification : styles.notification}
              key={notification.id}
              type="button"
              onClick={() => void markRead(notification.id)}
            >
              <span>
                <strong>{notification.title ?? notification.type}</strong>
                <small>{notification.message}</small>
              </span>
              <Badge tone={priorityTone(notification.priority)}>{notification.priority}</Badge>
            </button>
          ))}
        </div>
      </Card>
    </section>
  );
}

function ToggleGroup({
  items,
  onToggle
}: {
  items: Record<string, boolean>;
  onToggle: (key: string, enabled: boolean) => void;
}) {
  return (
    <div className={styles.toggleGrid}>
      {Object.entries(items).map(([key, enabled]) => (
        <label key={key} className={styles.toggleItem}>
          <span>{key}</span>
          <input checked={enabled} type="checkbox" onChange={(event) => onToggle(key, event.target.checked)} />
        </label>
      ))}
    </div>
  );
}

const priorityTone = (priority: string) => {
  if (priority === "urgent" || priority === "high") {
    return "warning";
  }

  return "neutral";
};
