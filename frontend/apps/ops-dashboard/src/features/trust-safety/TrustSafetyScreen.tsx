import { ModuleScreen } from "@/components";
import { findOpsRouteById } from "@/routes";

const route = findOpsRouteById("trustSafety");

export function TrustSafetyScreen() {
  return (
    <ModuleScreen
      eyebrow="Trust and safety"
      title="Review driver trust, document readiness, vehicle compliance, and safety risk"
      description="This screen will combine trust profile reviews with driver document and vehicle review queues. Ops can inspect scores, assign reviewers, add notes, and resolve safety reviews."
      backendModules={route.backendModules}
      primaryAction="Open Review Queue"
      secondaryAction="Run Trust Simulation"
      metrics={[
        { label: "Trust Reviews", value: "21", meta: "pending", tone: "warning" },
        { label: "Safe Profiles", value: "92%", meta: "approved drivers", tone: "success" },
        { label: "Doc Backlog", value: "18", meta: "waiting review", tone: "navy" },
        { label: "Risk Alerts", value: "5", meta: "needs action", tone: "danger" }
      ]}
      queue={[
        { title: "Driver route fairness review", meta: "Score dropped from 96 to 84", status: "trust", tone: "warning" },
        { title: "Vehicle RC mismatch", meta: "Registration photo and plate conflict", status: "vehicle", tone: "danger" },
        { title: "Document approval batch", meta: "12 profile photos ready for review", status: "docs", tone: "trust" }
      ]}
      workflows={[
        { label: "Trust profiles", backend: "GET /api/v1/private/trust/profiles", status: "review queue", progress: 35 },
        { label: "Driver documents", backend: "private/driver-documents", status: "approval flow", progress: 25 },
        { label: "Vehicle compliance", backend: "private/vehicle", status: "review flow", progress: 25 }
      ]}
    />
  );
}
