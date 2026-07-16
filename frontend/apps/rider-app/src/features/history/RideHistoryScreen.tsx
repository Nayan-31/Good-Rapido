import { Alert, Badge, Button, Card, MetricCard, ProgressBar } from "@good-rapido/ui";

import { formatCurrency, formatVehicleType } from "@/features/pricing/pricing.utils";
import type { RideHistoryFilter, RideHistoryItem } from "./rideHistory.types";
import { useRideHistory } from "./useRideHistory";
import { formatDate, formatPercent, getRideTitle } from "./rideHistory.utils";
import styles from "./RideHistoryScreen.module.css";

const filters: RideHistoryFilter[] = ["all", "active", "completed", "cancelled"];

export function RideHistoryScreen() {
  const {
    filter,
    rides,
    fares,
    selectedRide,
    receipt,
    transparency,
    isLoading,
    isReceiptLoading,
    message,
    loadHistory,
    loadReceipt
  } = useRideHistory();

  return (
    <section className={styles.root}>
      <Card className={styles.hero} variant="navy">
        <div className={styles.heroHeader}>
          <div>
            <p className={styles.eyebrow}>Ride History</p>
            <strong>{formatCurrency(transparency.totalSpend)}</strong>
            <span>{transparency.rideCount} rides reviewed for transparency</span>
          </div>
          <Badge tone={transparency.cancellationCount ? "warning" : "trust"}>
            {transparency.cancellationCount} cancelled
          </Badge>
        </div>
        <div className={styles.metrics}>
          <MetricCard label="Avg Fare" value={formatCurrency(transparency.averageFare)} />
          <MetricCard label="Fair Price" value={formatPercent(transparency.averageFairPriceScore)} />
          <MetricCard label="Route Accuracy" value={formatPercent(transparency.averageRouteAccuracyScore)} />
        </div>
      </Card>

      {message ? (
        <Alert tone="info" title="History Update">
          {message}
        </Alert>
      ) : null}

      <Card className={styles.section} variant="mint">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Transparency Cards</p>
            <h3>Fare, route, and safety signals</h3>
          </div>
          <Button size="sm" variant="secondary" isLoading={isLoading} onClick={() => void loadHistory(filter)}>
            Refresh
          </Button>
        </div>
        <div className={styles.transparencyGrid}>
          <TransparencyCard label="Fair Price" value={transparency.averageFairPriceScore} />
          <TransparencyCard label="Route Accuracy" value={transparency.averageRouteAccuracyScore} />
          <TransparencyCard label="Fare Logs" value={Math.min(100, fares.length * 12)} />
        </div>
      </Card>

      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Filter</p>
            <h3>{filter}</h3>
          </div>
        </div>
        <div className={styles.segmented}>
          {filters.map((item) => (
            <button
              className={item === filter ? styles.selectedSegment : undefined}
              key={item}
              type="button"
              onClick={() => void loadHistory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </Card>

      <div className={styles.contentGrid}>
        <Card className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Recent Rides</p>
              <h3>{rides.length} rides</h3>
            </div>
            <Badge tone="info">{filter}</Badge>
          </div>
          <div className={styles.rideList}>
            {rides.map((ride) => (
              <RideCard
                key={ride.id}
                ride={ride}
                isSelected={ride.id === selectedRide?.id}
                isLoading={isReceiptLoading && ride.id === selectedRide?.id}
                onSelect={() => void loadReceipt(ride.id)}
              />
            ))}
            {!rides.length ? <p className={styles.empty}>No rides found for this filter.</p> : null}
          </div>
        </Card>

        <Card className={styles.section} variant={receipt ? "soft" : "default"}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Receipt Transparency</p>
              <h3>{receipt?.receipt.receiptNumber ?? "Select a ride"}</h3>
            </div>
            <Badge tone={receipt ? "trust" : "neutral"}>{receipt?.ride.lifecycleStatus ?? "waiting"}</Badge>
          </div>
          {receipt ? (
            <>
              <dl className={styles.breakdown}>
                {receipt.receipt.lineItems.map((item) => (
                  <div key={item.code}>
                    <dt>{item.label}</dt>
                    <dd>{formatCurrency(item.amount, receipt.receipt.currency)}</dd>
                  </div>
                ))}
                <div>
                  <dt>Paid amount</dt>
                  <dd>{formatCurrency(receipt.receipt.paymentSummary.paidAmount, receipt.receipt.currency)}</dd>
                </div>
              </dl>
              <div className={styles.receiptMetrics}>
                <MetricCard label="Fare Confidence" value={formatPercent(receipt.receipt.fareSummary.fareConfidenceScore)} />
                <MetricCard label="Driver Trust" value={formatPercent(receipt.receipt.trustSummary.driverTrustScore)} />
                <MetricCard label="Risk" value={receipt.receipt.trustSummary.cancellationRiskLevel ?? "low"} />
              </div>
            </>
          ) : (
            <p className={styles.empty}>Open a ride receipt to review exact fare and trust signals.</p>
          )}
        </Card>
      </div>
    </section>
  );
}

function TransparencyCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.transparencyCard}>
      <div>
        <span>{label}</span>
        <strong>{formatPercent(value)}</strong>
      </div>
      <ProgressBar value={value} label={label} />
    </div>
  );
}

function RideCard({
  ride,
  isSelected,
  isLoading,
  onSelect
}: {
  ride: RideHistoryItem;
  isSelected: boolean;
  isLoading: boolean;
  onSelect: () => void;
}) {
  return (
    <button className={isSelected ? styles.selectedRide : styles.rideCard} type="button" onClick={onSelect}>
      <span>
        <strong>{getRideTitle(ride)}</strong>
        <small>{formatDate(ride.completedAt ?? ride.cancelledAt ?? ride.createdAt)}</small>
      </span>
      <span>
        <b>{formatCurrency(ride.totalFare, ride.currency)}</b>
        <small>{formatVehicleType(ride.vehicleType)}</small>
      </span>
      <span>
        <b>{formatPercent(ride.fairPriceScore)}</b>
        <small>Fair price</small>
      </span>
      <span>
        <b>{formatPercent(ride.routeAccuracyScore)}</b>
        <small>{isLoading ? "Loading" : ride.lifecycleStatus}</small>
      </span>
    </button>
  );
}
