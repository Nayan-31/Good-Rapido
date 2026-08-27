import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, MetricCard, ProgressBar } from "@good-rapido/ui";

import { EmptyState, LoadingRows, StatusBanner } from "@/components";
import { findOpsRouteById } from "@/routes";
import { analyticsOpsService } from "./analytics.service";
import type {
  AnalyticsBreakdownPoint,
  AnalyticsFilters,
  AnalyticsForecast,
  AnalyticsLoadResult,
  ForecastFormState
} from "./analytics.types";
import styles from "./AnalyticsScreen.module.css";

const route = findOpsRouteById("analytics");

const initialFilters: AnalyticsFilters = {
  period: "this_week",
  groupBy: "day",
  limit: "100"
};

const initialForecastForm: ForecastFormState = {
  baselineRides: "120",
  averageFare: "185",
  growthRate: "0.08",
  platformFeeRate: "0.2",
  forecastDays: "7"
};

export function AnalyticsScreen() {
  const [filters, setFilters] = useState<AnalyticsFilters>(initialFilters);
  const [analytics, setAnalytics] = useState<AnalyticsLoadResult>({
    options: null,
    overview: null,
    rides: null,
    revenue: null,
    drivers: null,
    trustSafety: null,
    alerts: []
  });
  const [forecastForm, setForecastForm] = useState<ForecastFormState>(initialForecastForm);
  const [forecast, setForecast] = useState<AnalyticsForecast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await analyticsOpsService.load(filters);
      setAnalytics(data);
      setMessage(data.alerts.length ? null : "Analytics refreshed from backend data");
    } catch (caughtError) {
      setError(resolveErrorMessage(caughtError));
      setAnalytics((current) => ({
        ...current,
        overview: null,
        rides: null,
        revenue: null,
        drivers: null,
        trustSafety: null,
        alerts: []
      }));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const periodOptions = analytics.options?.periods.length ? analytics.options.periods : ["today", "this_week", "this_month", "custom"];
  const groupByOptions = analytics.options?.groupBy.length ? analytics.options.groupBy : ["day", "week", "month"];
  const overview = analytics.overview;
  const rideSeries = analytics.rides?.series ?? [];
  const revenueByMethod = analytics.revenue?.byMethod ?? [];
  const driverSupply = analytics.drivers?.supplyByApprovalStatus ?? [];
  const topDrivers = analytics.drivers?.topDrivers ?? [];
  const trustSafety = analytics.trustSafety;

  const riskProgress = useMemo(() => {
    const totalSignals = (trustSafety?.summary.trust.totalProfiles ?? 0) + (trustSafety?.summary.fraud.totalCases ?? 0);

    if (!totalSignals) {
      return 0;
    }

    const openSignals = (trustSafety?.summary.trust.openReviews ?? 0) + (trustSafety?.summary.fraud.openCases ?? 0);
    return Math.round((openSignals / totalSignals) * 100);
  }, [trustSafety?.summary.fraud.openCases, trustSafety?.summary.fraud.totalCases, trustSafety?.summary.trust.openReviews, trustSafety?.summary.trust.totalProfiles]);

  const canRunForecast = Boolean(
    toNumber(forecastForm.baselineRides) >= 0 &&
    toNumber(forecastForm.averageFare) > 0 &&
    toNumber(forecastForm.forecastDays) > 0
  );

  const runForecast = async () => {
    setPendingAction("forecast");
    setError(null);
    setMessage(null);

    try {
      const result = await analyticsOpsService.forecast({
        baselineRides: toNumber(forecastForm.baselineRides),
        averageFare: toNumber(forecastForm.averageFare),
        growthRate: toNumber(forecastForm.growthRate),
        platformFeeRate: toNumber(forecastForm.platformFeeRate),
        forecastDays: toNumber(forecastForm.forecastDays)
      });

      setForecast(result);
      setMessage("Forecast generated from backend analytics engine");
    } catch (caughtError) {
      setError(resolveErrorMessage(caughtError));
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <section className={styles.screen}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Analytics</span>
          <h1>Analyze rides, revenue, drivers, trust-safety, and operational forecasts</h1>
          <p>
            Connected with {route.backendModules.join(", ")} for overview cards, ride/revenue breakdowns,
            driver supply, trust-safety queues, and forecast simulations.
          </p>
        </div>
        <div className={styles.heroActions}>
          <Button type="button" onClick={() => void loadAnalytics()} isLoading={isLoading}>Refresh Analytics</Button>
          <Badge tone={error ? "danger" : "trust"}>{error ? "Needs analytics auth" : "Backend wired"}</Badge>
        </div>
      </section>

      <Card padding="lg" className={styles.filterPanel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>Date And Grouping Filters</span>
            <h2>Analytics window</h2>
          </div>
          <Badge tone="navy">{formatLabel(filters.period)}</Badge>
        </div>
        <div className={styles.filters}>
          <SelectField label="Period" value={filters.period} options={periodOptions} onChange={(period) => setFilters((current) => ({ ...current, period }))} />
          <SelectField label="Group By" value={filters.groupBy} options={groupByOptions} onChange={(groupBy) => setFilters((current) => ({ ...current, groupBy }))} />
          <label className={styles.field}>
            <span>Limit</span>
            <input value={filters.limit} onChange={(event) => setFilters((current) => ({ ...current, limit: event.target.value }))} />
          </label>
          <Button type="button" variant="secondary" onClick={() => setFilters(initialFilters)}>
            Reset
          </Button>
        </div>
      </Card>

      <section className={styles.metrics}>
        <MetricCard label="Net Revenue" value={formatCurrency(overview?.summary.revenue.netRevenue ?? 0)} meta={`${overview?.summary.revenue.succeededPayments ?? 0} paid`} tone="navy" />
        <MetricCard label="Ride Volume" value={String(overview?.summary.rides.totalRides ?? 0)} meta={`${overview?.summary.rides.confirmedRides ?? 0} confirmed`} tone="success" />
        <MetricCard label="Online Drivers" value={String(overview?.summary.drivers.onlineDrivers ?? 0)} meta={`${overview?.summary.drivers.pendingDrivers ?? 0} pending`} tone="trust" />
        <MetricCard label="Open Risk Signals" value={String(overview?.summary.trustSafety.openFraudCases ?? 0)} meta={`${overview?.summary.disputes.openDisputes ?? 0} disputes`} tone="warning" />
      </section>

      {analytics.alerts.length ? (
        <StatusBanner tone="warning" title="Some analytics requests need attention">
          {analytics.alerts.join(" | ")}
        </StatusBanner>
      ) : null}
      {error ? <StatusBanner tone="danger" title="Analytics request failed">{error}</StatusBanner> : null}
      {message ? <StatusBanner tone="success" title="Analytics update completed">{message}</StatusBanner> : null}

      <section className={styles.workspace}>
        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Ride Analytics</span>
              <h2>Completed ride pattern</h2>
            </div>
            <Badge tone="success">{analytics.rides?.summary.totalRides ?? 0} rides</Badge>
          </div>
          {isLoading ? <LoadingRows rows={4} columns={2} /> : <BarChart points={rideSeries} valueKey="totalRides" />}
          {!isLoading && !rideSeries.length ? (
            <EmptyState title="No ride analytics yet" description="Seed or complete rides, then refresh analytics to see ride trend bars." />
          ) : null}
        </Card>

        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Revenue Analytics</span>
              <h2>Payment method split</h2>
            </div>
            <Badge tone="navy">{formatCurrency(analytics.revenue?.summary.grossRevenue ?? 0)}</Badge>
          </div>
          {isLoading ? <LoadingRows rows={4} columns={2} /> : (
            <BreakdownList points={revenueByMethod} valueKey="netRevenue" emptyTitle="No revenue methods yet" />
          )}
        </Card>

        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Driver Analytics</span>
              <h2>Fleet supply and top drivers</h2>
            </div>
            <Badge tone="trust">{analytics.drivers?.summary.totalDrivers ?? 0} drivers</Badge>
          </div>
          {isLoading ? <LoadingRows rows={4} columns={2} /> : (
            <>
              <BreakdownList points={driverSupply} valueKey="totalDrivers" emptyTitle="No driver supply data yet" />
              <div className={styles.topList}>
                {topDrivers.slice(0, 4).map((driver) => (
                  <article key={driver.driverId}>
                    <span>{driver.fullName || driver.driverId}</span>
                    <strong>{driver.rideCount} rides</strong>
                    <small>{formatCurrency(driver.totalFare)} total fare</small>
                  </article>
                ))}
                {!topDrivers.length ? <p>No top drivers available yet.</p> : null}
              </div>
            </>
          )}
        </Card>

        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Trust-Safety Analytics</span>
              <h2>Open review signals</h2>
            </div>
            <Badge tone={riskProgress > 35 ? "danger" : "trust"}>{riskProgress}% open</Badge>
          </div>
          {isLoading ? <LoadingRows rows={4} columns={2} /> : (
            <div className={styles.riskPanel}>
              <ProgressBar value={riskProgress} label="Open risk signals across trust and fraud" showValue tone="trust" />
              <div className={styles.riskGrid}>
                <span><strong>{trustSafety?.summary.trust.openReviews ?? 0}</strong> trust reviews</span>
                <span><strong>{trustSafety?.summary.fraud.openCases ?? 0}</strong> fraud cases</span>
                <span><strong>{trustSafety?.summary.disputes.urgentDisputes ?? 0}</strong> urgent disputes</span>
                <span><strong>{trustSafety?.summary.ratings.negativeRatings ?? 0}</strong> negative ratings</span>
              </div>
              {!trustSafety ? <EmptyState title="No trust-safety data" description="Trust-safety queues will appear after backend records are available." /> : null}
            </div>
          )}
        </Card>
      </section>

      <Card padding="lg" className={styles.forecastPanel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>Forecast Form</span>
            <h2>Operational projection</h2>
          </div>
          <Badge tone="info">private/analytics/forecast</Badge>
        </div>

        <div className={styles.forecastGrid}>
          <div className={styles.formGrid}>
            <TextField label="Baseline Rides" value={forecastForm.baselineRides} onChange={(baselineRides) => setForecastForm((current) => ({ ...current, baselineRides }))} />
            <TextField label="Average Fare" value={forecastForm.averageFare} onChange={(averageFare) => setForecastForm((current) => ({ ...current, averageFare }))} />
            <TextField label="Growth Rate" value={forecastForm.growthRate} onChange={(growthRate) => setForecastForm((current) => ({ ...current, growthRate }))} />
            <TextField label="Platform Fee Rate" value={forecastForm.platformFeeRate} onChange={(platformFeeRate) => setForecastForm((current) => ({ ...current, platformFeeRate }))} />
            <TextField label="Forecast Days" value={forecastForm.forecastDays} onChange={(forecastDays) => setForecastForm((current) => ({ ...current, forecastDays }))} />
            <Button type="button" disabled={!canRunForecast} onClick={() => void runForecast()} isLoading={pendingAction === "forecast"}>
              Run Forecast
            </Button>
          </div>

          <div className={styles.preview}>
            <div className={styles.previewHeader}>
              <span>Projected Platform Revenue</span>
              <strong>{formatCurrency(forecast?.summary.projectedPlatformRevenue ?? 0)}</strong>
            </div>
            <div className={styles.previewCards}>
              <div><span>Projected Rides</span><strong>{forecast?.summary.projectedRides ?? 0}</strong></div>
              <div><span>Gross Revenue</span><strong>{formatCurrency(forecast?.summary.projectedGrossRevenue ?? 0)}</strong></div>
              <div><span>Driver Payout</span><strong>{formatCurrency(forecast?.summary.projectedDriverPayout ?? 0)}</strong></div>
            </div>
            <BarChart points={forecast?.forecast.map((item) => ({ bucket: `Day ${item.day}`, totalRides: item.rides })) ?? []} valueKey="totalRides" />
            {!forecast ? <EmptyState title="Forecast waiting" description="Run the forecast to preview projected ride volume, revenue, platform fee, and driver payout." /> : null}
          </div>
        </div>
      </Card>
    </section>
  );
}

function BarChart({ points, valueKey }: { points: AnalyticsBreakdownPoint[]; valueKey: keyof AnalyticsBreakdownPoint }) {
  const values = points.map((point) => Number(point[valueKey]) || 0);
  const maxValue = Math.max(...values, 1);

  if (!points.length) {
    return null;
  }

  return (
    <div className={styles.barChart}>
      {points.slice(0, 10).map((point) => {
        const value = Number(point[valueKey]) || 0;
        const height = Math.max(10, Math.round((value / maxValue) * 100));

        return (
          <div className={styles.barItem} key={point.bucket || point.key}>
            <span style={{ height: `${height}%` }} />
            <small>{point.bucket || formatLabel(point.key)}</small>
            <strong>{formatChartValue(valueKey, value)}</strong>
          </div>
        );
      })}
    </div>
  );
}

function BreakdownList({
  points,
  valueKey,
  emptyTitle
}: {
  points: AnalyticsBreakdownPoint[];
  valueKey: keyof AnalyticsBreakdownPoint;
  emptyTitle: string;
}) {
  if (!points.length) {
    return <EmptyState title={emptyTitle} description="No backend records are available for this breakdown yet." />;
  }

  const maxValue = Math.max(...points.map((point) => Number(point[valueKey]) || 0), 1);

  return (
    <div className={styles.breakdownList}>
      {points.slice(0, 6).map((point) => {
        const value = Number(point[valueKey]) || 0;

        return (
          <article key={point.key || point.bucket}>
            <div>
              <strong>{formatLabel(point.key || point.bucket)}</strong>
              <span>{formatChartValue(valueKey, value)}</span>
            </div>
            <ProgressBar value={Math.round((value / maxValue) * 100)} tone="trust" />
          </article>
        );
      })}
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{formatLabel(option)}</option>
        ))}
      </select>
    </label>
  );
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

const formatLabel = (value: string | null | undefined) =>
  (value || "not_available").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatChartValue = (key: keyof AnalyticsBreakdownPoint, value: number) =>
  ["grossRevenue", "netRevenue", "totalFare", "averageFare"].includes(String(key)) ? formatCurrency(value) : String(value);

const toNumber = (value: string) => Number(value) || 0;

const resolveErrorMessage = (caughtError: unknown) => {
  if (caughtError instanceof Error) {
    return caughtError.message;
  }

  return "Analytics data could not be loaded";
};
