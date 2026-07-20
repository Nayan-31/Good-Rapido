import { ModuleScreen } from "@/components";
import { findOpsRouteById } from "@/routes";

const route = findOpsRouteById("pricing");

export function PricingScreen() {
  return (
    <ModuleScreen
      eyebrow="Pricing operations"
      title="Manage fare rules, surge windows, simulations, and transparent pricing controls"
      description="This area aligns private pricing and surge modules with the pricing engine. Ops can review active rules, simulate fare impact, activate or archive rules, and keep fare changes explainable."
      backendModules={route.backendModules}
      primaryAction="Simulate Fare"
      secondaryAction="Create Rule"
      metrics={[
        { label: "Active Rules", value: "12", meta: "pricing + surge", tone: "navy" },
        { label: "Avg Surge", value: "1.18x", meta: "city level", tone: "warning" },
        { label: "Confidence", value: "95%", meta: "fare engine", tone: "trust" },
        { label: "Rule Drift", value: "2", meta: "needs audit", tone: "danger" }
      ]}
      queue={[
        { title: "Airport pickup multiplier", meta: "1.4x proposed for 19:00-22:00", status: "simulate", tone: "warning" },
        { title: "Rain protection rule", meta: "Fairness note required before activation", status: "draft", tone: "trust" },
        { title: "Old city base fare", meta: "Archive candidate after 30 days idle", status: "archive", tone: "neutral" }
      ]}
      workflows={[
        { label: "Pricing rules", backend: "GET /api/v1/private/pricing/rules", status: "CRUD screens", progress: 35 },
        { label: "Surge controls", backend: "GET /api/v1/private/surge/rules", status: "window controls", progress: 30 },
        { label: "Fare simulation", backend: "POST /api/v1/private/pricing/simulate", status: "calculator", progress: 25 }
      ]}
    />
  );
}
