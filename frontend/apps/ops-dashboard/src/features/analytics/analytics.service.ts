import type { ApiQuery, ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type {
  AnalyticsFilters,
  AnalyticsForecast,
  AnalyticsLoadResult,
  AnalyticsOptions,
  AnalyticsOverview,
  DriverAnalytics,
  ForecastFormState,
  RevenueAnalytics,
  RideAnalytics,
  TrustSafetyAnalytics
} from "./analytics.types";

type OptionsResponse = ApiResponse<{ options: AnalyticsOptions }>;
type OverviewResponse = ApiResponse<{ analytics: AnalyticsOverview }>;
type RideResponse = ApiResponse<{ analytics: RideAnalytics }>;
type RevenueResponse = ApiResponse<{ analytics: RevenueAnalytics }>;
type DriverResponse = ApiResponse<{ analytics: DriverAnalytics }>;
type TrustSafetyResponse = ApiResponse<{ analytics: TrustSafetyAnalytics }>;
type ForecastResponse = ApiResponse<{ analytics: AnalyticsForecast }>;

export const analyticsService = {
  async load(filters: AnalyticsFilters): Promise<AnalyticsLoadResult> {
    const query = buildQuery(filters);
    const breakdownQuery = {
      ...query,
      groupBy: filters.groupBy
    };

    const [options, overview, rides, revenue, drivers, trustSafety] = await Promise.allSettled([
      apiClient.private.analytics.getOptions() as Promise<OptionsResponse>,
      apiClient.private.analytics.getOverview(query) as Promise<OverviewResponse>,
      apiClient.private.analytics.getRides(breakdownQuery) as Promise<RideResponse>,
      apiClient.private.analytics.getRevenue(breakdownQuery) as Promise<RevenueResponse>,
      apiClient.private.analytics.getDrivers(query) as Promise<DriverResponse>,
      apiClient.private.analytics.getTrustSafety(query) as Promise<TrustSafetyResponse>
    ]);

    return {
      options: fulfilledData(options)?.options ?? null,
      overview: fulfilledData(overview)?.analytics ?? null,
      rides: fulfilledData(rides)?.analytics ?? null,
      revenue: fulfilledData(revenue)?.analytics ?? null,
      drivers: fulfilledData(drivers)?.analytics ?? null,
      trustSafety: fulfilledData(trustSafety)?.analytics ?? null,
      alerts: [
        ...alertFromResult("Analytics options", options),
        ...alertFromResult("Overview", overview),
        ...alertFromResult("Ride analytics", rides),
        ...alertFromResult("Revenue analytics", revenue),
        ...alertFromResult("Driver analytics", drivers),
        ...alertFromResult("Trust-safety analytics", trustSafety)
      ]
    };
  },

  async forecast(form: ForecastFormState) {
    const response = await apiClient.private.analytics.forecast({
      baselineRides: Number(form.baselineRides) || 0,
      averageFare: Number(form.averageFare) || 0,
      growthRate: Number(form.growthRate) || 0,
      platformFeeRate: Number(form.platformFeeRate) || 0,
      forecastDays: Number(form.forecastDays) || 7
    }) as ForecastResponse;

    return response.data?.analytics ?? null;
  }
};

const buildQuery = (filters: AnalyticsFilters): ApiQuery => {
  const query: ApiQuery = {
    period: filters.period,
    limit: Number(filters.limit) || 100
  };

  if (filters.period === "custom") {
    query.from = filters.from;
    query.to = filters.to;
  }

  return query;
};

const fulfilledData = <TData>(result: PromiseSettledResult<ApiResponse<TData>>) => (
  result.status === "fulfilled" ? result.value.data : null
);

const alertFromResult = (label: string, result: PromiseSettledResult<unknown>) => {
  if (result.status === "fulfilled") {
    return [];
  }

  return [`${label}: ${result.reason instanceof Error ? result.reason.message : "request failed"}`];
};
