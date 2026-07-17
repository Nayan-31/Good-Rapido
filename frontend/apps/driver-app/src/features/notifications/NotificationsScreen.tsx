import { EmptyScreen } from "@/components";

export function NotificationsScreen() {
  return (
    <EmptyScreen
      eyebrow="Notifications"
      title="Driver alerts"
      description="Inbox separates ride requests, document checks, payout updates, and safety messages."
      badge="Step 08"
      badgeTone="info"
      visualLabel="Priority inbox"
      visualVariant="profile"
      primaryAction="Open latest"
      secondaryAction="Mark read"
      metrics={[
        { label: "Unread", value: "3", hint: "One payout update", tone: "warning" },
        { label: "Ride", value: "1", hint: "Peak demand nearby", tone: "navy" },
        { label: "Docs", value: "1", hint: "RC reminder", tone: "warning" }
      ]}
      panels={[
        {
          title: "Latest alerts",
          items: [
            { label: "Peak area", value: "New", tone: "warning" },
            { label: "Payout", value: "Processed", tone: "success" },
            { label: "Document", value: "Action", tone: "info" }
          ]
        },
        {
          title: "Preferences",
          items: [
            { label: "Ride alerts", value: "On", tone: "success" },
            { label: "Earnings", value: "On", tone: "success" },
            { label: "Marketing", value: "Off", tone: "neutral" }
          ]
        }
      ]}
    />
  );
}
