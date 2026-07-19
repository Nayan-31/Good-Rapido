import { Alert, Badge, Button, ProgressBar } from "@good-rapido/ui";

import { useDriverEarnings } from "./useDriverEarnings";
import type { DriverRideEarning } from "./earnings.types";
import styles from "./EarningsScreen.module.css";

export function EarningsScreen() {
  const { earnings, error, isLoading, reload } = useDriverEarnings();
  const summary = earnings.summary;

  return (
    <section className={styles.screen}>
      <section className={styles.hero}>
        <div>
          <Badge tone="success">Step 06</Badge>
          <h1>Driver earnings</h1>
          <p>Track today earnings, weekly payout readiness, ride-level breakdowns, incentives, penalties, and settlement status.</p>
        </div>
        <div className={styles.payoutCard}>
          <span>Available payout</span>
          <strong>{formatMoney(summary.availableForPayout)}</strong>
          <small>{formatStatus(summary.payoutStatus)}</small>
        </div>
      </section>

      {error ? (
        <Alert tone="danger" title="Earnings failed">
          {error}
        </Alert>
      ) : null}
      {earnings.backendNote ? (
        <Alert tone="info" title="Backend integration note">
          {earnings.backendNote}
        </Alert>
      ) : null}

      <section className={styles.statsGrid}>
        <StatCard label="Today earnings" value={formatMoney(summary.todayEarnings)} helper={`${summary.rideCount} completed rides`} tone="success" />
        <StatCard label="Weekly summary" value={formatMoney(summary.weeklyEarnings)} helper="Current week net earnings" />
        <StatCard label="Incentives" value={formatMoney(summary.incentiveAmount + summary.tipAmount)} helper="Peak bonus plus tips" tone="success" />
        <StatCard label="Penalties" value={formatMoney(summary.penaltyAmount)} helper="Deductions and holds" tone={summary.penaltyAmount ? "warning" : "success"} />
      </section>

      <section className={styles.contentGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Ride earnings breakdown</span>
              <h2>Recent completed rides</h2>
            </div>
            <Button type="button" variant="secondary" isLoading={isLoading} onClick={() => void reload()}>
              Refresh
            </Button>
          </div>

          <div className={styles.rideList}>
            {earnings.rides.map((ride) => (
              <RideEarningCard key={ride.rideId} ride={ride} />
            ))}
          </div>
        </article>

        <div className={styles.breakdownGrid}>
          <article className={styles.panel}>
            <div>
              <span className={styles.eyebrow}>Today split</span>
              <h2>Fare components</h2>
            </div>
            <LineItem label="Gross fare" value={formatMoney(summary.grossFare)} />
            <LineItem label="Driver fare" value={formatMoney(summary.driverFare)} />
            <LineItem label="Incentives" value={`+${formatMoney(summary.incentiveAmount)}`} positive />
            <LineItem label="Tips" value={`+${formatMoney(summary.tipAmount)}`} positive />
            <LineItem label="Platform fee" value={`-${formatMoney(summary.platformFee)}`} negative />
            <LineItem label="Penalties" value={`-${formatMoney(summary.penaltyAmount)}`} negative={summary.penaltyAmount > 0} />
            <ProgressBar value={Math.min(summary.averageNetPerRide, 500)} max={500} label="Average net per ride" showValue tone="trust" />
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>Payout status</span>
                <h2>Weekly statements</h2>
              </div>
              <Badge tone="trust">{formatMoney(summary.pendingEarnings)} pending</Badge>
            </div>
            <div className={styles.statementGrid}>
              {earnings.statements.map((statement) => (
                <div className={styles.statementCard} key={statement.statementId}>
                  <div>
                    <span>{statement.period}</span>
                    <strong>{statement.rideCount} rides</strong>
                    <small>{formatStatus(statement.status)}</small>
                  </div>
                  <div>
                    <strong>{formatMoney(statement.netEarnings)}</strong>
                    <small>{formatMoney(statement.availableForPayout)} available</small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <Alert tone="trust" title="Payout guidance">
            {summary.nextAction}
          </Alert>
        </div>
      </section>
    </section>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  helper: string;
  tone?: "success" | "warning" | "neutral";
}

function StatCard({ label, value, helper, tone = "neutral" }: StatCardProps) {
  return (
    <article className={styles.statCard} data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}

function RideEarningCard({ ride }: { ride: DriverRideEarning }) {
  return (
    <article className={styles.rideCard}>
      <div className={styles.rideHeader}>
        <div>
          <span>{ride.bookingCode}</span>
          <strong>{ride.route}</strong>
          <small>{ride.completedAt}</small>
        </div>
        <strong className={styles.amount}>{formatMoney(ride.netEarning)}</strong>
      </div>
      <ProgressBar value={Math.min(ride.netEarning, ride.grossFare)} max={Math.max(ride.grossFare, 1)} label="Net earning from gross fare" showValue tone="success" />
      <div className={styles.rideFooter}>
        <Badge tone={ride.paymentStatus === "settled" ? "success" : "warning"}>{formatStatus(ride.paymentStatus)}</Badge>
        <small>{ride.guidance}</small>
      </div>
    </article>
  );
}

interface LineItemProps {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}

function LineItem({ label, value, positive = false, negative = false }: LineItemProps) {
  return (
    <div className={styles.lineItem} data-negative={negative} data-positive={positive}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const formatMoney = (value: number) => `Rs ${Math.round(value).toLocaleString("en-IN")}`;

const formatStatus = (value: string) => value.replace(/_/g, " ");
