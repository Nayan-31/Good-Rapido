import { ModuleScreen } from "@/components";
import { findOpsRouteById } from "@/routes";

const route = findOpsRouteById("overview");

export function OverviewScreen() {
  return (
    <ModuleScreen
      eyebrow="Ops command center"
      title="Monitor platform health across rides, drivers, pricing, trust, and support"
      description="This screen is the first operational view for admins and ops agents. It will combine admin dashboard, analytics overview, and ride-ops dashboard data into one scan-friendly control room."
      backendModules={route.backendModules}
      primaryAction="Refresh Health"
      secondaryAction="Open Analytics"
      metrics={[
        { label: "Active Rides", value: "128", meta: "ride-ops dashboard", tone: "navy" },
        { label: "Online Drivers", value: "842", meta: "availability + analytics", tone: "trust" },
        { label: "Open Reviews", value: "37", meta: "trust, fraud, disputes", tone: "warning" },
        { label: "Fare Stability", value: "96%", meta: "pricing confidence", tone: "success" }
      ]}
      queue={[
        { title: "Airport zone high surge", meta: "Pricing review needed before activation", status: "pricing", tone: "warning" },
        { title: "Driver document backlog", meta: "18 profiles waiting for ops review", status: "review", tone: "trust" },
        { title: "Route fairness dip", meta: "Salt Lake route score below threshold", status: "watch", tone: "danger" }
      ]}
      workflows={[
        { label: "Operational overview", backend: "GET /api/v1/private/analytics/overview", status: "analytics binding", progress: 40 },
        { label: "Ride health", backend: "GET /api/v1/private/ride-ops/dashboard", status: "queue binding", progress: 35 },
        { label: "Admin summary", backend: "GET /api/v1/private/admin/dashboard", status: "permission binding", progress: 25 }
      ]}
    />
  );
}
