import { ModuleScreen } from "@/components";
import { findOpsRouteById } from "@/routes";

const route = findOpsRouteById("rideOps");

export function RideOpsScreen() {
  return (
    <ModuleScreen
      eyebrow="Ride operations"
      title="Control ride queues, driver assignment, cancellation, and lifecycle exceptions"
      description="This screen maps to the private ride-ops module and lifecycle engine. Ops users will review active rides, resolve stuck states, reassign drivers, confirm rides, and cancel unsafe trips."
      backendModules={route.backendModules}
      primaryAction="Open Ride Queue"
      secondaryAction="Review Lifecycle"
      metrics={[
        { label: "Driver Selected", value: "24", meta: "pending confirmation", tone: "warning" },
        { label: "In Progress", value: "76", meta: "live lifecycle", tone: "trust" },
        { label: "Needs Reassign", value: "6", meta: "driver unavailable", tone: "danger" },
        { label: "Lifecycle SLA", value: "94%", meta: "healthy state changes", tone: "success" }
      ]}
      queue={[
        { title: "GRD-2948 stuck at driver selected", meta: "No confirmation after 4 minutes", status: "assign", tone: "warning" },
        { title: "GRD-3011 route deviation", meta: "Lifecycle says in progress, route score dropped", status: "review", tone: "danger" },
        { title: "GRD-3094 cancellation request", meta: "Rider requested support approval", status: "cancel", tone: "navy" }
      ]}
      workflows={[
        { label: "Ride queue", backend: "GET /api/v1/private/ride-ops/rides", status: "list + filters", progress: 45 },
        { label: "Reassign driver", backend: "PATCH /api/v1/private/ride-ops/rides/:rideId/driver", status: "write action", progress: 20 },
        { label: "Lifecycle exception", backend: "core/ride-lifecycle", status: "state audit", progress: 30 }
      ]}
    />
  );
}
