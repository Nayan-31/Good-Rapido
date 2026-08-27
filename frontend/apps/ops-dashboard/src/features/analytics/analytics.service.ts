import type { ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type {
  AnalyticsFilters,
  AnalyticsForecast,
  AnalyticsLoadResult,
  AnalyticsOptions,
  AnalyticsOverview,
  DriverAnalytics,
  ForecastPayload,
  RevenueAnalytics,
  RideAnalytics,
  TrustSafetyAnalytics
} from "./analytics.types";

type AnalyticsResponse<TData> = ApiResponse<{ analytics: TData }>;
type OptionsResponse = ApiResponse<{ options: AnalyticsOptions }>;

export const analyticsOpsService = {
  async load(filters: AnalyticsFilters): Promise<AnalyticsLoadResult> {
    const query = buildQuery(filters);

    const [optionsResult, overviewResult, ridesResult, revenueResult, driversResult, trustSafetyResult] = await Promise.allSettled([
      apiClient.private.analytics.getOptions() as Promise<OptionsResponse>,
      apiClient.private.analytics.getOverview(query) as Promise<AnalyticsResponse<AnalyticsOverview>>,
      apiClient.private.analytics.getRides(query) as Promise<AnalyticsResponse<RideAnalytics>>,
      apiClient.private.analytics.getRevenue(query) as Promise<AnalyticsResponse<RevenueAnalytics>>,
      apiClient.private.analytics.getDrivers(query) as Promise<AnalyticsResponse<DriverAnalytics>>,
      apiClient.private.analytics.getTrustSafety(query) as Promise<AnalyticsResponse<TrustSafetyAnalytics>>
    ]);

    return {
      options: optionsResult.status === "fulfilled" ? optionsResult.value.data?.options ?? null : null,
      overview: unwrapAnalytics(overviewResult),
      rides: unwrapAnalytics(ridesResult),
      revenue: unwrapAnalytics(revenueResult),
      drivers: unwrapAnalytics(driversResult),
      trustSafety: unwrapAnalytics(trustSafetyResult),
      alerts: [
        ...alertFromResult("Analytics options", optionsResult),
        ...alertFromResult("Analytics overview", overviewResult),
        ...alertFromResult("Ride analytics", ridesResult),
        ...alertFromResult("Revenue analytics", revenueResult),
        ...alertFromResult("Driver analytics", driversResult),
        ...alertFromResult("Trust-safety analytics", trustSafetyResult)
      ]
    };
  },

  async forecast(payload: ForecastPayload): Promise<AnalyticsForecast | null> {
    const response = await apiClient.private.analytics.forecast({ ...payload }) as AnalyticsResponse<AnalyticsForecast>;

    return response.data?.analytics ?? null;
  }
};

const buildQuery = (filters: AnalyticsFilters) => ({
  period: filters.period,
  groupBy: filters.groupBy,
  limit: Number(filters.limit) || 100
});

const unwrapAnalytics = <TData>(result: PromiseSettledResult<AnalyticsResponse<TData>>) =>
  result.status === "fulfilled" ? result.value.data?.analytics ?? null : null;

const alertFromResult = (label: string, result: PromiseSettledResult<unknown>) => {
  if (result.status === "fulfilled") {
    return [];
  }

  return [`${label}: ${result.reason instanceof Error ? result.reason.message : "request failed"}`];
};
