import { Alert, Badge, Button, ProgressBar } from "@good-rapido/ui";

import { useActiveRide } from "./useActiveRide";
import type { DriverRideLifecycleStatus } from "@/features/ride-requests/rideRequest.types";
import styles from "./ActiveRideScreen.module.css";

export function ActiveRideScreen() {
  const activeRide = useActiveRide();
  const ride = activeRide.ride;
  const nextEvent = activeRide.nextEvent;

  return (
    <section className={styles.screen}>
      <section className={styles.hero}>
        <div>
          <Badge tone="navy">Step 05</Badge>
          <h1>Active ride control</h1>
          <p>Move the trip from pickup navigation to completion while route fairness, detour, and lifecycle status stay visible.</p>
        </div>
        <div className={styles.fareLock}>
          <span>Locked fare</span>
          <strong>{ride ? formatMoney(ride.fare.totalFare) : "--"}</strong>
          <small>{ride ? `${ride.fare.confidenceScore}% confidence` : "Loading"}</small>
        </div>
      </section>

      {activeRide.error ? (
        <Alert tone="danger" title="Active ride failed">
          {activeRide.error}
        </Alert>
      ) : null}
      {activeRide.message ? (
        <Alert tone="trust" title="Lifecycle update">
          {activeRide.message}
        </Alert>
      ) : null}
      {activeRide.backendNote ? (
        <Alert tone="info" title="Backend integration note">
          {activeRide.backendNote}
        </Alert>
      ) : null}

      {ride ? (
        <section className={styles.layout}>
          <article className={styles.mapPanel} aria-label="Live route fairness preview">
            <div className={styles.mapCanvas}>
              <div className={styles.pickupRoute} />
              <div className={styles.tripRoute} />
              <span className={styles.driverMarker}>DR</span>
              <span className={styles.pickupMarker}>P</span>
              <span className={styles.dropoffMarker}>D</span>
              <div className={styles.detourWarning}>
                <strong>{ride.route.detourPercentage > 3 ? "Detour warning" : "Route clean"}</strong>
                <p>
                  {ride.route.detourPercentage > 3
                    ? `Detected ${ride.route.detourPercentage}% detour. Keep rider informed before route change.`
                    : `${ride.route.detourPercentage}% detour and ${ride.route.routeAccuracyScore}% route accuracy.`}
                </p>
              </div>
              <div className={styles.mapOverlay}>
                <strong>{routeTitle(ride.lifecycleStatus)}</strong>
                <p>
                  {ride.lifecycleStatus === "driver_en_route"
                    ? `Navigate ${ride.route.pickupDistanceKm} km to pickup in about ${ride.route.pickupEtaMinutes} minutes.`
                    : `Follow the ${ride.route.tripDistanceKm} km trip route with ${ride.route.trafficLevel} traffic.`}
                </p>
                <ProgressBar value={ride.route.routeFairnessScore} label="Route fairness" showValue tone="trust" />
              </div>
            </div>
          </article>

          <div className={styles.contentStack}>
            <article className={styles.panel}>
              <div className={styles.rideTitle}>
                <div>
                  <span className={styles.eyebrow}>Lifecycle status</span>
                  <h2>{statusLabel(ride.lifecycleStatus)}</h2>
                </div>
                <span className={styles.rideCode}>{ride.bookingCode}</span>
              </div>

              <div className={styles.locationList}>
                <div className={styles.routeStep} data-stop="pickup">
                  <span className={styles.marker}>P</span>
                  <div>
                    <span>Pickup</span>
                    <strong>{ride.pickup.address}</strong>
                  </div>
                </div>
                <div className={styles.routeStep} data-stop="dropoff">
                  <span className={styles.marker}>D</span>
                  <div>
                    <span>Dropoff</span>
                    <strong>{ride.dropoff.address}</strong>
                  </div>
                </div>
              </div>

              <ProgressBar value={activeRide.progress} label="Ride progress" showValue tone="success" />

              <div className={styles.statusGrid}>
                <StatusCard label="Pickup ETA" value={`${ride.route.pickupEtaMinutes} min`} helper={`${ride.route.pickupDistanceKm} km away`} />
                <StatusCard label="Trip route" value={`${ride.route.tripDurationMinutes} min`} helper={`${ride.route.tripDistanceKm} km total`} />
                <StatusCard label="Rider trust" value={`${ride.rider.rating.toFixed(1)}`} helper={ride.rider.verificationStatus} />
              </div>
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>Ride controls</span>
                  <h2>Next driver action</h2>
                </div>
                <Badge tone={nextEvent ? "success" : "neutral"}>{nextEvent ? "Action ready" : "Closed"}</Badge>
              </div>

              <div className={styles.controlGrid}>
                <ControlCard
                  active={ride.lifecycleStatus === "driver_en_route"}
                  buttonLabel="Mark arrived"
                  disabled={ride.lifecycleStatus !== "driver_en_route"}
                  helper="Updates lifecycle when driver reaches the pickup pin."
                  isSaving={activeRide.isSaving}
                  label="Navigate to pickup"
                  value="Pickup route active"
                  onClick={() => void activeRide.markArrived()}
                />
                <ControlCard
                  active={ride.lifecycleStatus === "driver_arrived"}
                  buttonLabel="Start ride"
                  disabled={ride.lifecycleStatus !== "driver_arrived"}
                  helper="Starts the trip after rider boards and fare remains locked."
                  isSaving={activeRide.isSaving}
                  label="Pickup confirmed"
                  value="Rider onboarding"
                  onClick={() => void activeRide.startRide()}
                />
                <ControlCard
                  active={ride.lifecycleStatus === "in_progress"}
                  buttonLabel="Complete ride"
                  disabled={ride.lifecycleStatus !== "in_progress"}
                  helper="Completes lifecycle, route fairness, and fare transparency logs."
                  isSaving={activeRide.isSaving}
                  label="Ride in progress"
                  value="Dropoff flow"
                  onClick={() => void activeRide.completeRide()}
                />
              </div>
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>Route fairness and detour</span>
                  <h2>Live route signals</h2>
                </div>
                <Badge tone={ride.route.detourPercentage > 3 ? "warning" : "success"}>
                  {ride.route.detourPercentage > 3 ? "Review" : "Clear"}
                </Badge>
              </div>

              <div className={styles.routeGrid}>
                <div className={styles.routeScore}>
                  <span>Fairness</span>
                  <strong>{ride.route.routeFairnessScore}%</strong>
                  <small>Route engine confidence</small>
                </div>
                <StatusCard label="Detour" value={`${ride.route.detourPercentage}%`} helper="Compared with expected route" />
                <StatusCard label="Fare integrity" value={`${ride.rider.fairPriceScore}%`} helper="No hidden change to rider fare" />
              </div>
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>Timeline</span>
                  <h2>Lifecycle audit trail</h2>
                </div>
                <Button type="button" variant="secondary" isLoading={activeRide.isLoading} onClick={() => void activeRide.reload()}>
                  Refresh
                </Button>
              </div>

              <div className={styles.timeline}>
                {activeRide.lifecycleSteps.map((step) => (
                  <div className={styles.timelineItem} key={step.status}>
                    <div>
                      <span>{step.label}</span>
                      <strong>{step.helper}</strong>
                    </div>
                    <Badge tone={stepTone(step.status, ride.lifecycleStatus)}>
                      {stepStatusText(step.status, ride.lifecycleStatus)}
                    </Badge>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      ) : null}
    </section>
  );
}

interface StatusCardProps {
  label: string;
  value: string;
  helper: string;
}

function StatusCard({ label, value, helper }: StatusCardProps) {
  return (
    <div className={styles.statusCard}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </div>
  );
}

interface ControlCardProps {
  active: boolean;
  buttonLabel: string;
  disabled: boolean;
  helper: string;
  isSaving: boolean;
  label: string;
  value: string;
  onClick: () => void;
}

function ControlCard({ active, buttonLabel, disabled, helper, isSaving, label, value, onClick }: ControlCardProps) {
  return (
    <div className={styles.controlCard} data-active={active}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
      <Button fullWidth type="button" variant={active ? "mint" : "secondary"} disabled={disabled} isLoading={active && isSaving} onClick={onClick}>
        {buttonLabel}
      </Button>
    </div>
  );
}

const formatMoney = (value: number) => `Rs ${Math.round(value).toLocaleString("en-IN")}`;

const statusLabel = (status: DriverRideLifecycleStatus) => {
  const labels: Record<DriverRideLifecycleStatus, string> = {
    pending_confirmation: "Pending confirmation",
    driver_en_route: "Driver en route",
    driver_arrived: "Driver arrived",
    in_progress: "Ride in progress",
    completed: "Ride completed",
    cancelled: "Ride cancelled"
  };

  return labels[status];
};

const routeTitle = (status: DriverRideLifecycleStatus) => {
  if (status === "driver_en_route") {
    return "Navigate to pickup";
  }

  if (status === "driver_arrived") {
    return "Ready to start";
  }

  if (status === "in_progress") {
    return "Navigate to dropoff";
  }

  if (status === "completed") {
    return "Ride completed";
  }

  return "Lifecycle ready";
};

const statusOrder: Record<DriverRideLifecycleStatus, number> = {
  pending_confirmation: 0,
  driver_en_route: 1,
  driver_arrived: 2,
  in_progress: 3,
  completed: 4,
  cancelled: 5
};

const stepTone = (step: DriverRideLifecycleStatus, current: DriverRideLifecycleStatus) => {
  if (statusOrder[current] > statusOrder[step]) {
    return "success";
  }

  if (current === step) {
    return "trust";
  }

  return "neutral";
};

const stepStatusText = (step: DriverRideLifecycleStatus, current: DriverRideLifecycleStatus) => {
  if (statusOrder[current] > statusOrder[step]) {
    return "Done";
  }

  if (current === step) {
    return "Current";
  }

  return "Waiting";
};
