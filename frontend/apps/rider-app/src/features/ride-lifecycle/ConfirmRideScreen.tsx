import { Alert, Badge, Button, Card, MetricCard, ProgressBar } from "@good-rapido/ui";

import { formatCurrency, formatVehicleType } from "@/features/pricing/pricing.utils";
import type { DriverMatch } from "@/features/matching";
import { useConfirmRide } from "./useConfirmRide";
import styles from "./ConfirmRideScreen.module.css";

export function ConfirmRideScreen() {
  const {
    draft,
    drivers,
    selectedDriverId,
    booking,
    lifecycle,
    isMatching,
    isConfirming,
    message,
    loadMatches,
    selectDriver,
    confirmRide
  } = useConfirmRide();
  const pricingQuote = draft?.pricingQuote as { breakdown?: { totalFare?: number; currency?: string }; confidence?: { score?: number }; surge?: { multiplier?: number } } | undefined;
  const fareTotal = pricingQuote?.breakdown?.totalFare ?? draft?.fareEstimate?.breakdown.totalFare ?? 0;
  const currency = pricingQuote?.breakdown?.currency ?? draft?.fareEstimate?.breakdown.currency ?? "INR";

  if (!draft?.fareEstimate) {
    return (
      <section className={styles.root}>
        <Alert
          tone="warning"
          title="Fare Estimate Required"
          action={
            <Button size="sm" onClick={() => { window.location.hash = "/"; }}>
              Go Home
            </Button>
          }
        >
          Create a fare estimate before confirming a ride.
        </Alert>
      </section>
    );
  }

  return (
    <section className={styles.root}>
      <Card className={styles.hero} variant="navy">
        <div className={styles.heroHeader}>
          <div>
            <p className={styles.eyebrow}>Total Fare</p>
            <strong>{formatCurrency(fareTotal, currency)}</strong>
          </div>
          <Badge tone="trust">{formatVehicleType(draft.form.vehicleType)}</Badge>
        </div>
        <div className={styles.metrics}>
          <MetricCard label="Confidence" value={`${pricingQuote?.confidence?.score ?? draft.fareEstimate.confidence.score}%`} />
          <MetricCard label="Surge" value={`${pricingQuote?.surge?.multiplier ?? draft.fareEstimate.surge.multiplier}x`} />
          <MetricCard label="Drivers" value={drivers.length || 0} />
        </div>
      </Card>

      {message ? (
        <Alert tone={booking ? "trust" : "info"} title={booking ? "Ride Confirmed" : "Matching Update"}>
          {message}
        </Alert>
      ) : null}

      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Driver Matching</p>
            <h3>Trust-ranked drivers</h3>
          </div>
          <Button size="sm" variant="secondary" isLoading={isMatching} onClick={() => void loadMatches()}>
            Refresh
          </Button>
        </div>
        <div className={styles.driverList}>
          {drivers.map((driver) => (
            <DriverOption
              key={driver.driverId}
              driver={driver}
              isSelected={driver.driverId === selectedDriverId}
              onSelect={() => selectDriver(driver.driverId)}
            />
          ))}
        </div>
      </Card>

      <Card className={styles.section} variant="mint">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Trust Transparency</p>
            <h3>{booking?.selectedDriver.fullName ?? "Driver review before booking"}</h3>
          </div>
          <Badge tone={booking ? "success" : "trust"}>{booking?.status ?? "ready"}</Badge>
        </div>
        <div className={styles.metrics}>
          <MetricCard label="Route Fairness" value={`${booking?.trustSignals.routeFairnessScore ?? 0}%`} />
          <MetricCard label="Risk" value={booking?.trustSignals.cancellationRiskLevel ?? "low"} />
          <MetricCard label="Fair Price" value={`${booking?.trustSignals.fairPriceScore ?? pricingQuote?.confidence?.score ?? 0}%`} />
        </div>
      </Card>

      {lifecycle ? (
        <Card className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Ride Lifecycle</p>
              <h3>{lifecycle.progress.currentStep ?? lifecycle.lifecycleStatus}</h3>
            </div>
            <Badge tone="navy">{lifecycle.lifecycleStatus}</Badge>
          </div>
          <ProgressBar value={lifecycle.progress.percentage} label="Ride Progress" showValue />
          <p className={styles.copy}>{lifecycle.progress.nextAction}</p>
        </Card>
      ) : null}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => { window.location.hash = "/estimate"; }}>
          Back To Estimate
        </Button>
        <Button isLoading={isConfirming} disabled={!selectedDriverId} onClick={() => void confirmRide()}>
          Confirm Booking
        </Button>
      </div>
    </section>
  );
}

interface DriverOptionProps {
  driver: DriverMatch;
  isSelected: boolean;
  onSelect: () => void;
}

function DriverOption({ driver, isSelected, onSelect }: DriverOptionProps) {
  return (
    <button className={isSelected ? `${styles.driverOption} ${styles.selectedDriver}` : styles.driverOption} type="button" onClick={onSelect}>
      <span>
        <strong>{driver.fullName}</strong>
        <small>
          {driver.vehicle.name} - {driver.vehicle.number}
        </small>
      </span>
      <span>
        <b>{driver.etaMinutes} min</b>
        <small>{driver.distanceKm} km away</small>
      </span>
      <span>
        <b>{driver.match.score}%</b>
        <small>Match</small>
      </span>
      <span>
        <b>{driver.trustSignals.trustScore}%</b>
        <small>Trust</small>
      </span>
    </button>
  );
}
