import { ModuleScreen } from "@/components";
import { findOpsRouteById } from "@/routes";

const route = findOpsRouteById("communications");

export function CommunicationsScreen() {
  return (
    <ModuleScreen
      eyebrow="Communications"
      title="Operate notifications, message retries, support handoffs, and incident broadcasts"
      description="This screen maps notification ops to the private notifications module and notification engine. It will give ops users a controlled way to create, send, retry, fail, and cancel operational messages."
      backendModules={route.backendModules}
      primaryAction="Create Notification"
      secondaryAction="View Support Load"
      metrics={[
        { label: "Queued Messages", value: "46", meta: "pending send", tone: "warning" },
        { label: "Delivery Health", value: "97%", meta: "last 24 hours", tone: "success" },
        { label: "Retries", value: "9", meta: "needs review", tone: "danger" },
        { label: "Support Tickets", value: "63", meta: "public support", tone: "trust" }
      ]}
      queue={[
        { title: "Safety broadcast draft", meta: "Heavy rain alert waiting for approval", status: "draft", tone: "warning" },
        { title: "Payment receipt retry", meta: "6 failed delivery attempts", status: "retry", tone: "danger" },
        { title: "Support escalation", meta: "Emergency contact mismatch", status: "support", tone: "trust" }
      ]}
      workflows={[
        { label: "Notification list", backend: "GET /api/v1/private/notifications/notifications", status: "message table", progress: 35 },
        { label: "Send/retry/cancel", backend: "private/notifications/:id/actions", status: "action controls", progress: 30 },
        { label: "Support handoff", backend: "public/support", status: "linked queue", progress: 20 }
      ]}
    />
  );
}
