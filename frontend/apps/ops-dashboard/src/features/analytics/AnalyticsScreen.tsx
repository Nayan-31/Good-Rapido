import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, MetricCard, ProgressBar } from "@good-rapido/ui";

import { findOpsRouteById } from "@/routes";
import { analyticsService } from "./analytics.service";
import type {
  AnalyticsFilters,
  AnalyticsForecast,
  AnalyticsOptions,
  AnalyticsOverview,
  DriverAnalytics,
  ForecastFormState,
  RevenueAnalytics,
  RideAnalytics,
  TrustSafetyAnalytics
} from "./analytics.types";
import styles from "./AnalyticsScreen.module.css";

const route = findOpsRouteById("analytics");

const today = new Date().toISOString().slice(0, 10);
const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const initialFilters: AnalyticsFilters = {
  period: "this_week",
  groupBy: "day",
  from: weekAgo,
  to: today,
  limit: "100"
};

const initialForecastForm: ForecastFormState = {
  baselineRides: "2400",
  averageFare: "185",
  growthRate: "0.08",
  platformFeeRate: "0.2",
  forecastDays: "7"
};

export function AnalyticsScreen() {
  const [options, setOptions] = useState<AnalyticsOptions | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [rides, setRides] = useState<RideAnalytics | null>(null);
  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null);
  const [drivers, setDrivers] = useState<DriverAnalytics | null>(null);
  const [trustSafety, setTrustSafety] = useState<TrustSafetyAnalytics | null>(null);
  const [forecast, setForecast] = useState<AnalyticsForecast | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>(initialFilters);
  const [forecastForm, setForecastForm] = useState<ForecastFormState>(initialForecastForm);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await analyticsService.load(filters);
      setOptions(data.options);
      setOverview(data.overview);
      setRides(data.rides);
      setRevenue(data.revenue);
      setDrivers(data.drivers);
      setTrustSafety(data.trustSafety);
      setAlerts(data.alerts);

      if (data.alerts.length) {
        setMessage(`${data.alerts.length} analytics source needs attention`);
      } else {
        setMessage(null);
      }
    } catch (caughtError) {
      setError(resolveErrorMessage(caughtError));
      setAlerts([]);
      setOverview(null);
      setRides(null);
      setRevenue(null);
      setDrivers(null);
      setTrustSafety(null);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const runForecast = async () => {
    setPendingAction("forecast");
    setError(null);
    setMessage(null);

    try {
      setForecast(await analyticsService.forecast(forecastForm));
      setMessage("Forecast completed");
    } catch (caughtError) {
      setError(resolveErrorMessage(caughtError));
    } finally {
      setPendingAction(null);
    }
  };

  const exportSummary = useMemo(() => ({
    period: filters.period,
    rides: overview?.summary.rides.totalRides ?? 0,
    netRevenue: overview?.summary.revenue.netRevenue ?? 0,
    onlineDrivers: overview?.summary.drivers.onlineDrivers ?? 0,
    openRisk: (overview?.summary.trustSafety.openFraudCases ?? 0) + (overview?.summary.disputes.openDisputes ?? 0)
  }), [filters.period, overview]);

  return (
    <section className={styles.screen}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Analytics</span>
          <h1>Analyze rides, revenue, drivers, trust-safety, and operational forecasts</h1>
          <p>Connected with {route.backendModules.join(", ")} for overview, ride breakdowns, revenue series, driver supply, trust-safety queues, and forecast simulation.</p>
        </div>
        <div className={styles.heroActions}>
          <Button type="button" onClick={() => void loadAnalytics()} isLoading={isLoading}>Refresh Analytics</Button>
          <Badge tone={error ? "danger" : alerts.length ? "warning" : "trust"}>{error ? "Needs auth/data" : alerts.length ? "Partial data" : "Backend wired"}</Badge>
        </div>
      </section>

      <section className={styles.metrics}>
        <MetricCard label="Total Rides" value={formatNumber(overview?.summary.rides.totalRides)} meta={`${overview?.summary.rides.confirmedRides ?? 0} confirmed`} tone="navy" />
        <MetricCard label="Net Revenue" value={formatCurrency(overview?.summary.revenue.netRevenue)} meta={`${overview?.summary.revenue.totalPayments ?? 0} payments`} tone="success" />
        <MetricCard label="Online Drivers" value={formatNumber(overview?.summary.drivers.onlineDrivers)} meta={`${overview?.summary.drivers.totalDrivers ?? 0} total`} tone="trust" />
        <MetricCard label="Risk Signals" value={formatNumber(exportSummary.openRisk)} meta="disputes + fraud" tone="warning" />
      </section>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}
      {message ? <div className={alerts.length ? styles.warningBanner : styles.successBanner}>{message}</div> : null}

      <Card padding="lg" className={styles.filterPanel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>Date Filters</span>
            <h2>Analytics window and grouping</h2>
          </div>
          <Badge tone="navy">{formatLabel(filters.period)}</Badge>
        </div>
        <div className={styles.filters}>
          <label className={styles.field}>
            <span>Period</span>
            <select value={filters.period} onChange={(event) => setFilters((current) => ({ ...current, period: event.target.value }))}>
              {(options?.periods ?? ["today", "this_week", "this_month", "custom"]).map((period) => <option value={period} key={period}>{formatLabel(period)}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Group By</span>
            <select value={filters.groupBy} onChange={(event) => setFilters((current) => ({ ...current, groupBy: event.target.value }))}>
              {(options?.groupBy ?? ["day", "week", "month"]).map((group) => <option value={group} key={group}>{formatLabel(group)}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>From</span>
            <input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
          </label>
          <label className={styles.field}>
            <span>To</span>
            <input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
          </label>
          <label className={styles.field}>
            <span>Limit</span>
            <input value={filters.limit} onChange={(event) => setFilters((current) => ({ ...current, limit: event.target.value }))} />
          </label>
        </div>
      </Card>

      {alerts.length ? (
        <Card padding="md" className={styles.alertPanel}>
          <strong>Loading alerts</strong>
          {alerts.map((alert) => <span key={alert}>{alert}</span>)}
        </Card>
      ) : null}

      <section className={styles.chartGrid}>
        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Rides Breakdown</span>
              <h2>Ride volume by {filters.groupBy}</h2>
            </div>
            <Badge tone="navy">{formatNumber(rides?.summary.totalRides)} rides</Badge>
          </div>
          <BarChart items={rides?.series ?? []} valueKey="totalRides" labelKey="bucket" />
          <BreakdownList title="Vehicle mix" items={rides?.byVehicleType ?? []} valueKey="totalRides" />
        </Card>

        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Revenue Breakdown</span>
              <h2>Net revenue trend</h2>
            </div>
            <Badge tone="success">{formatCurrency(revenue?.summary.netRevenue)}</Badge>
          </div>
          <BarChart items={revenue?.series ?? []} valueKey="netRevenue" labelKey="bucket" money />
          <BreakdownList title="Payment methods" items={revenue?.byMethod ?? []} valueKey="netRevenue" money />
        </Card>
      </section>

      <section className={styles.workspace}>
        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Driver Supply</span>
              <h2>Drivers and utilization</h2>
            </div>
            <Badge tone="trust">{drivers?.summary.onlineDrivers ?? 0} online</Badge>
          </div>
          <div className={styles.driverGrid}>
            <div><span>Approved</span><strong>{drivers?.summary.approvedDrivers ?? 0}</strong></div>
            <div><span>Pending</span><strong>{drivers?.summary.pendingDrivers ?? 0}</strong></div>
            <div><span>Review</span><strong>{drivers?.summary.underReviewDrivers ?? 0}</strong></div>
          </div>
          <TopDriverList drivers={drivers?.topDrivers ?? []} />
        </Card>

        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Trust-Safety Breakdown</span>
              <h2>Risk, disputes, and reviews</h2>
            </div>
            <Badge tone="warning">{trustSafety?.summary.fraud.openCases ?? 0} fraud open</Badge>
          </div>
          <div className={styles.riskGrid}>
            <ProgressBar value={trustSafety?.summary.trust.averageScore ?? 0} label="Average trust score" showValue tone="trust" />
            <ProgressBar value={trustSafety?.summary.fraud.averageRiskScore ?? 0} label="Average fraud risk" showValue tone="warning" />
          </div>
          <RiskQueues trustSafety={trustSafety} />
        </Card>
      </section>

      <section className={styles.forecastGrid}>
        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Forecast Form</span>
              <h2>Demand and revenue projection</h2>
            </div>
            <Badge tone="navy">{forecastForm.forecastDays} days</Badge>
          </div>
          <ForecastForm form={forecastForm} onChange={(field, value) => setForecastForm((current) => ({ ...current, [field]: value }))} />
          <div className={styles.actions}>
            <Button type="button" onClick={() => void runForecast()} isLoading={pendingAction === "forecast"}>Run Forecast</Button>
          </div>
        </Card>

        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Export-Ready Summary</span>
              <h2>Snapshot for reports</h2>
            </div>
            <Badge tone="trust">ready</Badge>
          </div>
          <div className={styles.exportGrid}>
            <div><span>Period</span><strong>{formatLabel(exportSummary.period)}</strong></div>
            <div><span>Rides</span><strong>{formatNumber(exportSummary.rides)}</strong></div>
            <div><span>Net Revenue</span><strong>{formatCurrency(exportSummary.netRevenue)}</strong></div>
            <div><span>Open Risk</span><strong>{formatNumber(exportSummary.openRisk)}</strong></div>
          </div>
          {forecast ? (
            <div className={styles.forecastSummary}>
              <span>Forecast Output</span>
              <strong>{formatNumber(forecast.summary.projectedRides)} rides - {formatCurrency(forecast.summary.projectedGrossRevenue)} gross</strong>
              <BarChart items={forecast.forecast} valueKey="grossRevenue" labelKey="day" money />
            </div>
          ) : <p className={styles.muted}>Run a forecast to generate projected rides, gross revenue, platform revenue, and driver payout.</p>}
        </Card>
      </section>
    </section>
  );
}

function BarChart({
  items,
  valueKey,
  labelKey,
  money = false
}: {
  items: object[];
  valueKey: string;
  labelKey: string;
  money?: boolean;
}) {
  const maxValue = Math.max(1, ...items.map((item) => Number(readChartValue(item, valueKey)) || 0));

  return (
    <div className={styles.chart}>
      {items.slice(0, 10).map((item, index) => {
        const value = Number(readChartValue(item, valueKey)) || 0;
        const label = readChartValue(item, labelKey);
        const height = Math.max(10, Math.round((value / maxValue) * 100));

        return (
          <div className={styles.barWrap} key={`${label ?? index}`}>
            <div className={styles.bar} style={{ height: `${height}%` }} title={money ? formatCurrency(value) : formatNumber(value)} />
            <span>{String(label ?? index + 1)}</span>
          </div>
        );
      })}
      {!items.length ? <p className={styles.muted}>No chart data available.</p> : null}
    </div>
  );
}

function BreakdownList({
  title,
  items,
  valueKey,
  money = false
}: {
  title: string;
  items: object[];
  valueKey: string;
  money?: boolean;
}) {
  return (
    <div className={styles.breakdown}>
      <strong>{title}</strong>
      {items.slice(0, 5).map((item) => (
        <div key={String(readChartValue(item, "key"))}>
          <span>{formatLabel(String(readChartValue(item, "key")))}</span>
          <b>{money ? formatCurrency(Number(readChartValue(item, valueKey)) || 0) : formatNumber(Number(readChartValue(item, valueKey)) || 0)}</b>
        </div>
      ))}
      {!items.length ? <p className={styles.muted}>No breakdown data available.</p> : null}
    </div>
  );
}

function TopDriverList({ drivers }: { drivers: Array<{ driverId: string; fullName: string | null; rideCount: number; totalFare: number }> }) {
  return (
    <div className={styles.topDrivers}>
      <strong>Top drivers</strong>
      {drivers.slice(0, 5).map((driver) => (
        <div key={driver.driverId}>
          <span>{driver.fullName || driver.driverId}</span>
          <b>{driver.rideCount} rides - {formatCurrency(driver.totalFare)}</b>
        </div>
      ))}
      {!drivers.length ? <p className={styles.muted}>No top driver data available.</p> : null}
    </div>
  );
}

function RiskQueues({ trustSafety }: { trustSafety: TrustSafetyAnalytics | null }) {
  return (
    <div className={styles.riskQueues}>
      <div>
        <strong>High risk trust</strong>
        {(trustSafety?.highRiskTrustProfiles ?? []).slice(0, 3).map((profile) => (
          <span key={profile.id}>{profile.subjectId} - {profile.overallScore}%</span>
        ))}
      </div>
      <div>
        <strong>Open fraud</strong>
        {(trustSafety?.openFraudCases ?? []).slice(0, 3).map((fraudCase) => (
          <span key={fraudCase.id}>{fraudCase.caseCode || fraudCase.id} - {fraudCase.riskScore}%</span>
        ))}
      </div>
      <div>
        <strong>Urgent disputes</strong>
        {(trustSafety?.urgentDisputes ?? []).slice(0, 3).map((dispute) => (
          <span key={dispute.id}>{dispute.disputeCode || dispute.id} - {formatCurrency(dispute.requestedRefundAmount ?? 0)}</span>
        ))}
      </div>
    </div>
  );
}

function ForecastForm({
  form,
  onChange
}: {
  form: ForecastFormState;
  onChange: (field: keyof ForecastFormState, value: string) => void;
}) {
  return (
    <div className={styles.form}>
      <label className={styles.field}>
        <span>Baseline Rides</span>
        <input value={form.baselineRides} onChange={(event) => onChange("baselineRides", event.target.value)} />
      </label>
      <label className={styles.field}>
        <span>Average Fare</span>
        <input value={form.averageFare} onChange={(event) => onChange("averageFare", event.target.value)} />
      </label>
      <label className={styles.field}>
        <span>Growth Rate</span>
        <input value={form.growthRate} onChange={(event) => onChange("growthRate", event.target.value)} />
      </label>
      <label className={styles.field}>
        <span>Platform Fee Rate</span>
        <input value={form.platformFeeRate} onChange={(event) => onChange("platformFeeRate", event.target.value)} />
      </label>
      <label className={styles.field}>
        <span>Forecast Days</span>
        <input value={form.forecastDays} onChange={(event) => onChange("forecastDays", event.target.value)} />
      </label>
    </div>
  );
}

const formatNumber = (value: number | null | undefined) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value || 0);

const formatCurrency = (value: number | null | undefined) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

const formatLabel = (value: string | null | undefined) =>
  (value || "not_available").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const readChartValue = (item: object, key: string) => (item as Record<string, string | number | undefined>)[key];

const resolveErrorMessage = (caughtError: unknown) => {
  if (caughtError instanceof Error) {
    return caughtError.message;
  }

  return "Analytics data could not be loaded";
};
