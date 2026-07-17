import { EmptyScreen } from "@/components";

export function SupportScreen() {
  return (
    <EmptyScreen
      eyebrow="Support"
      title="Driver support"
      description="Support center focuses on fare disputes, route issues, payment questions, and emergency escalation."
      badge="Step 10"
      badgeTone="danger"
      visualLabel="Support case center"
      visualVariant="setup"
      primaryAction="Create ticket"
      secondaryAction="Call support"
      metrics={[
        { label: "Open", value: "1", hint: "Fare review pending", tone: "warning" },
        { label: "Resolved", value: "12", hint: "Last 30 days", tone: "good" },
        { label: "Emergency", value: "Ready", hint: "24/7 escalation", tone: "danger" }
      ]}
      panels={[
        {
          title: "Quick issues",
          items: [
            { label: "Wrong route", value: "Report", tone: "info" },
            { label: "Payment delay", value: "Report", tone: "info" },
            { label: "Rider no-show", value: "Report", tone: "warning" }
          ]
        },
        {
          title: "Ticket status",
          items: [
            { label: "Fare review", value: "Open", tone: "warning" },
            { label: "Evidence", value: "Uploaded", tone: "success" },
            { label: "ETA", value: "2 hrs", tone: "neutral" }
          ]
        }
      ]}
    />
  );
}
