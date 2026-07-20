import { ModuleScreen } from "@/components";
import { findOpsRouteById } from "@/routes";

const route = findOpsRouteById("analytics");

export function AnalyticsScreen() {
  return (
    <ModuleScreen
      eyebrow="Analytics"
      title="Analyze rides, revenue, drivers, trust-safety, and operational forecasts"
      description="This screen is the analytics workbench for admins and ops. It will expose overview cards, ride/revenue breakdowns, driver health, trust-safety metrics, and forecast simulations."
      backendModules={route.backendModules}
      primaryAction="Run Forecast"
      secondaryAction="Export Snapshot"
      metrics={[
        { label: "Gross Revenue", value: "Rs 8.4L", meta: "today", tone: "navy" },
        { label: "Completed Rides", value: "2,418", meta: "city-wide", tone: "success" },
        { label: "Driver Utilization", value: "78%", meta: "active fleet", tone: "trust" },
        { label: "Safety Alerts", value: "11", meta: "open signals", tone: "warning" }
      ]}
      queue={[
        { title: "Revenue forecast", meta: "Weekend model needs demand inputs", status: "forecast", tone: "navy" },
        { title: "Driver supply gap", meta: "North zone under target by 12%", status: "supply", tone: "warning" },
        { title: "Trust-safety review", meta: "Low cancellation improved this week", status: "trend", tone: "success" }
      ]}
      workflows={[
        { label: "Overview", backend: "GET /api/v1/private/analytics/overview", status: "metric cards", progress: 35 },
        { label: "Breakdowns", backend: "rides, revenue, drivers, trust-safety", status: "charts", progress: 25 },
        { label: "Forecast", backend: "POST /api/v1/private/analytics/forecast", status: "scenario form", progress: 20 }
      ]}
    />
  );
}
