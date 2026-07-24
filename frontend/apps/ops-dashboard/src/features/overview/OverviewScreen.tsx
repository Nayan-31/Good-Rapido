import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, MetricCard, ProgressBar } from "@good-rapido/ui";

import { findOpsRouteById } from "@/routes";
import { overviewService } from "./overview.service";
import type { AdminDashboard, AnalyticsOverview, RideOpsDashboard } from "./overview.types";
import styles from "./OverviewScreen.module.css";

const route = findOpsRouteById("overview");

export function OverviewScreen() {
  const [adminDashboard, setAdminDashboard] = useState<AdminDashboard | null>(null);
  const [analyticsOverview, setAnalyticsOverview] = useState<AnalyticsOverview | null>(null);
  const [rideOpsDashboard, setRideOpsDashboard] = useState<RideOpsDashboard | null>(null);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);

    try {
      const result = await overviewService.loadOverview();

      setAdminDashboard(result.adminDashboard);
      setAnalyticsOverview(result.analyticsOverview);
      setRideOpsDashboard(result.rideOpsDashboard);
      setAlerts(result.alerts);
      setLastUpdatedAt(new Date().toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const healthScore = useMemo(() => {
    const rideRisk = rideOpsDashboard?.summary.highRiskRides ?? 0;
    const openFraud = analyticsOverview?.highlights.openFraudCases ?? 0;
    const openDisputes = analyticsOverview?.highlights.openDisputes ?? 0;
    const penalty = Math.min(42, rideRisk * 4 + openFraud * 3 + openDisputes * 2 + alerts.length * 8);

    return Math.max(58, 100 - penalty);
  }, [alerts.length, analyticsOverview, rideOpsDashboard]);

  const alertCards = [
    {
      title: "Ride Ops Queue",
      value: rideOpsDashboard?.summary.pendingConfirmation ?? 0,
      meta: "pending confirmations",
      tone: (rideOpsDashboard?.summary.pendingConfirmation ?? 0) > 0 ? "warning" : "success"
    },
    {
      title: "Lifecycle Exceptions",
      value: rideOpsDashboard?.summary.escalatedRides ?? 0,
      meta: "escalated rides",
      tone: (rideOpsDashboard?.summary.escalatedRides ?? 0) > 0 ? "danger" : "success"
    },
    {
      title: "Trust And Fraud",
      value: analyticsOverview?.highlights.openFraudCases ?? 0,
      meta: "open fraud cases",
      tone: (analyticsOverview?.highlights.openFraudCases ?? 0) > 0 ? "danger" : "trust"
    }
  ] as const;

  return (
    <section className={styles.screen}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Ops Command Center</span>
          <h1>Live platform overview across rides, revenue, users, and alerts</h1>
          <p>
            Pulling real data from {route.backendModules.join(", ")} with partial-error handling for role based access.
          </p>
        </div>
        <div className={styles.heroActions}>
          <Button type="button" onClick={() => void loadOverview()} isLoading={isLoading}>Refresh Health</Button>
          <Badge tone={alerts.length ? "warning" : "trust"}>{alerts.length ? `${alerts.length} alerts` : "Healthy"}</Badge>
        </div>
      </section>

      <section className={styles.metrics} aria-label="Overview metrics">
        <MetricCard label="Active Rides" value={String(rideOpsDashboard?.summary.activeRides ?? 0)} meta="private/ride-ops" tone="navy" />
        <MetricCard label="Net Revenue" value={formatCurrency(analyticsOverview?.highlights.netRevenue ?? 0)} meta="analytics overview" tone="success" />
        <MetricCard label="Online Drivers" value={String(analyticsOverview?.highlights.onlineDrivers ?? 0)} meta="driver supply" tone="trust" />
        <MetricCard label="Admin Users" value={String(adminDashboard?.summary.totalUsers ?? 0)} meta={`${adminDashboard?.summary.activeCount ?? 0} active`} tone="warning" />
      </section>

      <section className={styles.workspace}>
        <Card padding="lg" className={styles.healthPanel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Health Cards</span>
              <h2>Platform health score</h2>
            </div>
            <Badge tone={healthScore > 84 ? "success" : "warning"}>{lastUpdatedAt ?? "loading"}</Badge>
          </div>
          <div className={styles.healthScore}>
            <strong>{isLoading ? "--" : `${healthScore}%`}</strong>
            <span>Operational readiness</span>
          </div>
          <ProgressBar value={isLoading ? 20 : healthScore} label="Composite of ride ops, fraud, disputes, and endpoint availability" showValue tone="trust" />
          <div className={styles.healthGrid}>
            <div><span>Ride Volume</span><strong>{analyticsOverview?.highlights.rideVolume ?? 0}</strong></div>
            <div><span>Average Rating</span><strong>{(analyticsOverview?.highlights.averageRating ?? 0).toFixed(1)}</strong></div>
            <div><span>High Risk Trust</span><strong>{analyticsOverview?.highlights.highRiskTrustProfiles ?? 0}</strong></div>
          </div>
        </Card>

        <Card padding="lg" className={styles.alertPanel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Alerts Summary</span>
              <h2>Needs attention</h2>
            </div>
            <Badge tone="warning">{alertCards.reduce((sum, item) => sum + item.value, 0)} open</Badge>
          </div>
          <div className={styles.alertGrid}>
            {alertCards.map((alert) => (
              <div className={styles.alertCard} key={alert.title}>
                <Badge tone={alert.tone}>{alert.title}</Badge>
                <strong>{alert.value}</strong>
                <span>{alert.meta}</span>
              </div>
            ))}
          </div>
          {alerts.length ? (
            <div className={styles.endpointAlerts}>
              {alerts.map((alert) => <span key={alert}>{alert}</span>)}
            </div>
          ) : null}
        </Card>
      </section>

      <section className={styles.grid}>
        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Ride Queue</span>
              <h2>Latest operational rides</h2>
            </div>
            <Badge tone="navy">{rideOpsDashboard?.queue.length ?? 0} rows</Badge>
          </div>
          <div className={styles.list}>
            {(rideOpsDashboard?.queue ?? []).slice(0, 5).map((ride) => (
              <div className={styles.listItem} key={ride.id}>
                <div>
                  <strong>{ride.bookingCode || ride.id}</strong>
                  <span>{formatLabel(ride.guidance?.nextAction || ride.lifecycleStatus)}</span>
                </div>
                <Badge tone={ride.ops?.priority === "urgent" ? "danger" : "trust"}>{formatLabel(ride.ops?.issueStatus || "monitoring")}</Badge>
              </div>
            ))}
            {!rideOpsDashboard?.queue.length ? <p>No ride ops rows available yet.</p> : null}
          </div>
        </Card>

        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Admin Activity</span>
              <h2>Recent users</h2>
            </div>
            <Badge tone={adminDashboard ? "trust" : "warning"}>{adminDashboard ? "admin data" : "restricted"}</Badge>
          </div>
          <div className={styles.list}>
            {(adminDashboard?.recentUsers ?? []).slice(0, 5).map((user) => (
              <div className={styles.listItem} key={user.id}>
                <div>
                  <strong>{user.fullName || user.email || user.id}</strong>
                  <span>{formatLabel(user.role)} - {formatLabel(user.accountStatus)}</span>
                </div>
                <Badge tone={user.accountStatus === "active" ? "success" : "warning"}>{formatLabel(user.accountStatus)}</Badge>
              </div>
            ))}
            {!adminDashboard?.recentUsers.length ? <p>Admin user data is empty or not available for this role.</p> : null}
          </div>
        </Card>
      </section>
    </section>
  );
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

const formatLabel = (value: string | null | undefined) =>
  (value || "not_available").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
