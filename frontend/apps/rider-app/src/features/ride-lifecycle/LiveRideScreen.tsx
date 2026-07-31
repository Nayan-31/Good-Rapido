import { Alert, Badge, Button, Card, MetricCard, ProgressBar } from "@good-rapido/ui";

import { rideFlowStorage } from "@/features/booking/rideFlowStorage";
import { formatCurrency, formatVehicleType } from "@/features/pricing/pricing.utils";
import type { RideBooking, RideLifecycleView } from "./confirmRide.types";
import styles from "./LiveRideScreen.module.css";

export function LiveRideScreen() {
  const draft = rideFlowStorage.read();
  const booking = draft?.booking as RideBooking | undefined;
  const lifecycle = draft?.lifecycle as RideLifecycleView | undefined;

  if (!booking) {
    return (
      <section className={styles.root}>
        <Alert
          tone="warning"
          title="No Active Ride"
          action={
            <Button size="sm" onClick={() => { window.location.hash = "/"; }}>
              Book Ride
            </Button>
          }
        >
          Confirm a booking first to see live ride tracking.
        </Alert>
      </section>
    );
  }

  const lifecycleStatus = lifecycle?.lifecycleStatus ?? "confirmed";
  const rideStateLabel = booking.status === "confirmed" ? "Booking Confirmed" : "Ride Requested";
  const progress = lifecycle?.progress?.percentage ?? 24;
  const currentStep = lifecycle?.progress?.currentStep ?? "Waiting for driver confirmation";
  const nextAction = lifecycle?.progress?.nextAction ?? "Your matched driver can accept this request from the driver app.";

  return (
    <section className={styles.root}>
      <Card className={styles.hero} variant="navy">
        <div className={styles.heroHeader}>
          <div>
            <p className={styles.eyebrow}>{rideStateLabel}</p>
            <strong>{booking.bookingCode}</strong>
          </div>
          <Badge tone="success">{lifecycleStatus}</Badge>
        </div>

        <div className={styles.route}>
          <div>
            <span className={styles.dot} />
            <p>
              <small>Pickup</small>
              <b>{draft?.form.pickup.address ?? "Pickup selected"}</b>
            </p>
          </div>
          <div>
            <span className={`${styles.dot} ${styles.dropDot}`} />
            <p>
              <small>Dropoff</small>
              <b>{draft?.form.dropoff.address ?? "Dropoff selected"}</b>
            </p>
          </div>
        </div>
      </Card>

      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Live Ride</p>
            <h3>{currentStep}</h3>
          </div>
          <Badge tone="trust">{formatVehicleType(booking.vehicleType)}</Badge>
        </div>
        <ProgressBar value={progress} label="Ride Progress" showValue />
        <p className={styles.copy}>{nextAction}</p>
      </Card>

      <Card className={styles.section} variant="mint">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Driver</p>
            <h3>{booking.selectedDriver.fullName ?? "Matched driver"}</h3>
          </div>
          <Badge tone="success">{booking.selectedDriver.rating.toFixed(1)} rating</Badge>
        </div>
        <div className={styles.metrics}>
          <MetricCard label="ETA" value={`${booking.selectedDriver.etaMinutes} min`} />
          <MetricCard label="Route Fairness" value={`${booking.trustSignals.routeFairnessScore}%`} />
          <MetricCard label="Cancellation Risk" value={booking.trustSignals.cancellationRiskLevel ?? "low"} />
        </div>
      </Card>

      <Card className={styles.section}>
        <div className={styles.metrics}>
          <MetricCard
            label="Locked Fare"
            value={formatCurrency(booking.fareSnapshot.totalFare, booking.fareSnapshot.currency)}
          />
          <MetricCard label="Distance" value={`${booking.fareSnapshot.distanceKm} km`} />
          <MetricCard label="Confidence" value={`${booking.fareSnapshot.confidenceScore}%`} />
        </div>
      </Card>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => { window.location.hash = "/safety"; }}>
          Safety
        </Button>
        <Button onClick={() => { window.location.hash = "/history"; }}>
          View History
        </Button>
      </div>
    </section>
  );
}
