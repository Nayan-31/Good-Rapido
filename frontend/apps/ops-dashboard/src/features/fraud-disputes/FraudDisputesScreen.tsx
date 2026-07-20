import { ModuleScreen } from "@/components";
import { findOpsRouteById } from "@/routes";

const route = findOpsRouteById("fraudDisputes");

export function FraudDisputesScreen() {
  return (
    <ModuleScreen
      eyebrow="Fraud and disputes"
      title="Investigate suspicious rides, payment abuse, no-shows, and dispute escalations"
      description="This area connects private fraud, fraud-engine, and disputes APIs. Ops users will triage risk scores, assign cases, request evidence, resolve disputes, and document outcomes."
      backendModules={route.backendModules}
      primaryAction="Open Case Queue"
      secondaryAction="Simulate Risk"
      metrics={[
        { label: "Open Fraud Cases", value: "14", meta: "under review", tone: "danger" },
        { label: "Dispute Queue", value: "31", meta: "awaiting action", tone: "warning" },
        { label: "False Positive Rate", value: "4%", meta: "last 7 days", tone: "success" },
        { label: "Evidence SLA", value: "88%", meta: "within target", tone: "trust" }
      ]}
      queue={[
        { title: "Fake trip suspicion", meta: "GPS and lifecycle mismatch on GRD-3022", status: "fraud", tone: "danger" },
        { title: "Fare dispute evidence", meta: "Rider uploaded receipt screenshot", status: "evidence", tone: "warning" },
        { title: "Promo abuse cluster", meta: "5 accounts share payment fingerprint", status: "cluster", tone: "navy" }
      ]}
      workflows={[
        { label: "Fraud cases", backend: "GET /api/v1/private/fraud/cases", status: "triage queue", progress: 35 },
        { label: "Risk simulation", backend: "POST /api/v1/private/fraud/simulate", status: "model form", progress: 25 },
        { label: "Dispute resolution", backend: "private/disputes/:disputeId/resolve", status: "case actions", progress: 30 }
      ]}
    />
  );
}
