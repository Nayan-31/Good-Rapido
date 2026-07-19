import { Alert, Badge, Button, ProgressBar } from "@good-rapido/ui";

import { useRideRequests } from "./useRideRequests";
import type { DriverRideRiskLevel } from "./rideRequest.types";
import styles from "./RideRequestsScreen.module.css";

export interface RideRequestsScreenProps {
  onRideAccepted?: () => void;
}

export function RideRequestsScreen({ onRideAccepted }: RideRequestsScreenProps) {
  const rideRequests = useRideRequests(onRideAccepted);
  const request = rideRequests.request;

  return (
    <section className={styles.screen}>
      <section className={styles.hero}>
        <div>
          <Badge tone="warning">Step 04</Badge>
          <h1>Incoming ride request</h1>
          <p>Review pickup effort, payout, rider trust, fare confidence, and route fairness before accepting the trip.</p>
        </div>
        <div className={styles.timerCard}>
          <span>Decision window</span>
          <strong>{request ? "18s" : "--"}</strong>
          <small>{request ? "Auto refresh ready" : "No request"}</small>
        </div>
      </section>

      {rideRequests.error ? (
        <Alert tone="danger" title="Ride request failed">
          {rideRequests.error}
        </Alert>
      ) : null}
      {rideRequests.message ? (
        <Alert tone="trust" title="Ride request update">
          {rideRequests.message}
        </Alert>
      ) : null}
      {rideRequests.backendNote ? (
        <Alert tone="info" title="Backend integration note">
          {rideRequests.backendNote}
        </Alert>
      ) : null}

      {request ? (
        <section className={styles.layout}>
          <div className={styles.requestStack}>
            <article className={styles.panel}>
              <div className={styles.requestTitle}>
                <div>
                  <span className={styles.eyebrow}>New request</span>
                  <h2>{request.rider.riderName}</h2>
                </div>
                <span className={styles.requestCode}>{request.bookingCode}</span>
              </div>

              <div className={styles.locationList}>
                <div className={styles.routeStep} data-stop="pickup">
                  <span className={styles.marker}>P</span>
                  <div>
                    <span>Pickup</span>
                    <strong>{request.pickup.address}</strong>
                  </div>
                </div>
                <div className={styles.routeStep} data-stop="dropoff">
                  <span className={styles.marker}>D</span>
                  <div>
                    <span>Dropoff</span>
                    <strong>{request.dropoff.address}</strong>
                  </div>
                </div>
              </div>

              <div className={styles.metricGrid}>
                <MetricCard label="Pickup route" value={`${request.route.pickupEtaMinutes} min`} hint={`${request.route.pickupDistanceKm} km away`} />
                <MetricCard label="Trip route" value={`${request.route.tripDistanceKm} km`} hint={`${request.route.tripDurationMinutes} min estimate`} />
                <MetricCard label="Route fairness" value={`${request.route.routeFairnessScore}%`} hint={`${request.route.detourPercentage}% detour`} />
              </div>
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>Fare preview</span>
                  <h2>Transparent payout</h2>
                </div>
                <Badge tone="success">{request.fare.confidenceScore}% confidence</Badge>
              </div>

              <div className={styles.fareTotal}>
                <span>Driver payout</span>
                <strong>{formatMoney(request.fare.driverPayout)}</strong>
                <small>Total rider fare {formatMoney(request.fare.totalFare)}</small>
              </div>

              <div className={styles.fareList}>
                <FareRow label="Base fare" value={formatMoney(request.fare.baseFare)} />
                <FareRow label="Distance fare" value={formatMoney(request.fare.distanceFare)} />
                <FareRow label="Time fare" value={formatMoney(request.fare.timeFare)} />
                <FareRow label="Peak bonus" value={`+${formatMoney(request.fare.surgeBonus)}`} highlight />
                <FareRow label="Platform fee" value={`-${formatMoney(request.fare.platformFee)}`} />
              </div>
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>Rider trust and fare transparency</span>
                  <h2>Safety signals</h2>
                </div>
                <Badge tone={riskTone(request.rider.cancellationRiskLevel)}>{request.rider.cancellationRiskLevel} risk</Badge>
              </div>

              <div className={styles.trustGrid}>
                <div className={styles.trustCard}>
                  <span>Rider rating</span>
                  <strong>{request.rider.rating.toFixed(1)}</strong>
                  <small>{request.rider.completedRides} completed rides</small>
                </div>
                <div className={styles.trustCard}>
                  <span>Fair price</span>
                  <strong>{request.rider.fairPriceScore}%</strong>
                  <small>{request.rider.verificationStatus}</small>
                </div>
              </div>

              <ProgressBar value={request.rider.fareConfidenceScore} label="Fare confidence" showValue tone="success" />

              <ul className={styles.noteList}>
                {request.transparencyNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </article>

            <div className={styles.actionRow}>
              <Button
                fullWidth
                isLoading={rideRequests.isSaving}
                type="button"
                variant="mint"
                onClick={() => void rideRequests.acceptRequest()}
              >
                Accept ride
              </Button>
              <Button
                fullWidth
                disabled={rideRequests.isSaving}
                type="button"
                variant="secondary"
                onClick={() => void rideRequests.declineRequest()}
              >
                Decline
              </Button>
            </div>
          </div>

          <article className={styles.mapPanel} aria-label="Pickup route summary">
            <div className={styles.mapCanvas}>
              <div className={styles.pickupRoute} />
              <div className={styles.tripRoute} />
              <span className={styles.mapMarker} data-kind="driver">DR</span>
              <span className={styles.mapMarker} data-kind="pickup">P</span>
              <span className={styles.mapMarker} data-kind="dropoff">D</span>
              <div className={styles.mapBadge}>{request.route.trafficLevel} traffic</div>
              <div className={styles.mapSummary}>
                <strong>Pickup route summary</strong>
                <p>
                  Reach pickup in {request.route.pickupEtaMinutes} minutes, then follow a {request.route.tripDistanceKm} km
                  fair route with {request.route.routeAccuracyScore}% route accuracy.
                </p>
                <ProgressBar value={request.route.routeFairnessScore} label="Route fairness" showValue tone="trust" />
              </div>
            </div>
          </article>
        </section>
      ) : (
        <article className={styles.emptyState}>
          <Badge tone="neutral">{rideRequests.declinedRequestCode ? "Declined" : "Waiting"}</Badge>
          <h2>{rideRequests.declinedRequestCode ? "Request cleared" : "No incoming request"}</h2>
          <p>
            {rideRequests.declinedRequestCode
              ? `${rideRequests.declinedRequestCode} was removed from your request queue.`
              : rideRequests.isLoading
                ? "Checking ride-ops queue and matching signals..."
                : "Stay online to receive the next transparent request."}
          </p>
          <Button type="button" variant="secondary" isLoading={rideRequests.isLoading} onClick={() => void rideRequests.reload()}>
            Refresh requests
          </Button>
        </article>
      )}
    </section>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  hint: string;
}

function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <div className={styles.metricCard}>
      <span className={styles.metricLabel}>{label}</span>
      <strong className={styles.metricValue}>{value}</strong>
      <small className={styles.metricHint}>{hint}</small>
    </div>
  );
}

interface FareRowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function FareRow({ label, value, highlight = false }: FareRowProps) {
  return (
    <div className={styles.fareRow} data-highlight={highlight}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const formatMoney = (value: number) => `Rs ${Math.round(value).toLocaleString("en-IN")}`;

const riskTone = (riskLevel: DriverRideRiskLevel) => {
  if (riskLevel === "high") {
    return "danger";
  }

  if (riskLevel === "medium") {
    return "warning";
  }

  return "success";
};
