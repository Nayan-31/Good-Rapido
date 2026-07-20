import type { ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type { AdminDashboard, AnalyticsOverview, OverviewLoadResult, RideOpsDashboard } from "./overview.types";

type AdminDashboardResponse = ApiResponse<{ dashboard: AdminDashboard }>;
type AnalyticsOverviewResponse = ApiResponse<AnalyticsOverview>;
type RideOpsDashboardResponse = ApiResponse<{ dashboard: RideOpsDashboard }>;

export const overviewService = {
  async loadOverview(): Promise<OverviewLoadResult> {
    const [adminResult, analyticsResult, rideOpsResult] = await Promise.allSettled([
      apiClient.private.admin.getDashboard() as Promise<AdminDashboardResponse>,
      apiClient.private.analytics.getOverview({ period: "7d" }) as Promise<AnalyticsOverviewResponse>,
      apiClient.private.rideOps.getDashboard() as Promise<RideOpsDashboardResponse>
    ]);

    const alerts = [
      ...alertFromResult("Admin dashboard", adminResult),
      ...alertFromResult("Analytics overview", analyticsResult),
      ...alertFromResult("Ride operations", rideOpsResult)
    ];

    return {
      adminDashboard: adminResult.status === "fulfilled" ? adminResult.value.data?.dashboard ?? null : null,
      analyticsOverview: analyticsResult.status === "fulfilled" ? analyticsResult.value.data ?? null : null,
      rideOpsDashboard: rideOpsResult.status === "fulfilled" ? rideOpsResult.value.data?.dashboard ?? null : null,
      alerts
    };
  }
};

const alertFromResult = (label: string, result: PromiseSettledResult<unknown>) => {
  if (result.status === "fulfilled") {
    return [];
  }

  return [`${label}: ${result.reason instanceof Error ? result.reason.message : "request failed"}`];
};
