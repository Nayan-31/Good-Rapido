import { Alert, Badge, Button, ProgressBar, TextField } from "@good-rapido/ui";
import { DriverLocationMap } from "./DriverLocationMap";
import { useDriverAvailability } from "./useDriverAvailability";
import { useDriverEarnings } from "@/features/earnings";
import { useDriverNotifications } from "@/features/notifications";
import { useDriverProfile } from "@/features/profile";
import { useRideRequests } from "@/features/ride-requests";
import { useDriverTrust } from "@/features/trust";
import styles from "./AvailabilityScreen.module.css";

export function AvailabilityScreen() {
  const driverAvailability = useDriverAvailability();
  const driverEarnings = useDriverEarnings();
  const driverNotifications = useDriverNotifications();
  const driverProfile = useDriverProfile();
  const driverTrust = useDriverTrust();
  const rideRequests = useRideRequests();
  const availability = driverAvailability.availability;
  const earningsSummary = driverEarnings.earnings.summary;
  const profile = driverProfile.profile;
  const trust = driverTrust.profile;
  const request = rideRequests.request;
  const canAcceptRequest = request?.bookingStatus === "driver_selected" && request.lifecycleStatus === "pending_confirmation";
  const hasActiveRide = Boolean(request && !canAcceptRequest);
  const isOnline = availability?.isOnline ?? false;
  const blockers = availability?.guidance.blockers ?? [];
  const locationFresh = availability?.guidance.locationFresh ?? false;
  const documentIssues = profile.documents.filter((document) => document.required && document.status !== "approved").length;
  const earnings = [
    { label: "Completed rides", value: String(earningsSummary.rideCount), helper: `${formatMoney(earningsSummary.todayEarnings)} today net` },
    { label: "Available payout", value: formatMoney(earningsSummary.availableForPayout), helper: formatStatus(earningsSummary.payoutStatus) },
    { label: "Pending earnings", value: formatMoney(earningsSummary.pendingEarnings), helper: earningsSummary.nextAction }
  ];
  const documentStatuses = profile.documents.length
    ? profile.documents.slice(0, 4).map((document) => ({
      label: document.label,
      status: formatStatus(document.status),
      tone: statusTone(document.status)
    }))
    : [{ label: "Required documents", status: "Not uploaded", tone: "warning" as const }];
  const notifications = driverNotifications.view.notifications.slice(0, 3);
  const hasSharedLocation = Boolean(availability?.currentLocation) || driverAvailability.locationForm.source === "gps";
  const mapLatitude = hasSharedLocation
    ? parseCoordinate(availability?.currentLocation?.latitude, driverAvailability.locationForm.latitude)
    : null;
  const mapLongitude = hasSharedLocation
    ? parseCoordinate(availability?.currentLocation?.longitude, driverAvailability.locationForm.longitude)
    : null;
  const mapAccuracy = hasSharedLocation
    ? parseCoordinate(availability?.currentLocation?.accuracyMeters, driverAvailability.locationForm.accuracyMeters)
    : null;
  const lastGpsLabel = driverAvailability.gps.lastGpsAt
    ? formatTime(driverAvailability.gps.lastGpsAt)
    : availability?.currentLocation?.capturedAt
      ? formatTime(availability.currentLocation.capturedAt)
      : "Not shared yet";

  return (
    <section className={styles.screen}>
      <section className={styles.heroPanel}>
        <div className={styles.statusHeader}>
          <div>
            <Badge tone={isOnline ? "success" : "neutral"}>{isOnline ? "Online" : "Offline"}</Badge>
            <h1>Driver dashboard</h1>
            <p>Track shift readiness, earnings, active demand, documents, trust, and alerts before accepting rides.</p>
          </div>
          <button
            className={styles.statusToggle}
            data-active={isOnline}
            type="button"
            aria-pressed={isOnline}
            disabled={driverAvailability.isSaving || driverAvailability.gps.isLocating}
            onClick={() => void driverAvailability.updateStatus(isOnline ? "offline" : "online")}
          >
            <span />
            {isOnline ? "Go offline" : "Go online with GPS"}
          </button>
        </div>

        <div className={styles.summaryGrid}>
          <article className={styles.summaryCard} data-tone="earnings">
            <span>Today earnings</span>
            <strong>{formatMoney(earningsSummary.todayEarnings)}</strong>
            <small>{earningsSummary.rideCount} completed rides</small>
          </article>
          <article className={styles.summaryCard} data-tone="trust">
            <span>Trust score</span>
            <strong>{formatTrustScore(trust.trustScore)}</strong>
            <small>{trust.trustLevel}</small>
          </article>
          <article className={styles.summaryCard} data-tone="docs">
            <span>Document status</span>
            <strong>{profile.documentPercent}%</strong>
            <small>{documentIssues ? `${documentIssues} item needs action` : "Ready documents"}</small>
          </article>
        </div>
      </section>

      {driverAvailability.error ? (
        <Alert tone="danger" title="Availability update failed">
          {driverAvailability.error}
        </Alert>
      ) : null}
      {driverAvailability.message ? (
        <Alert tone="trust" title="Availability update">
          {driverAvailability.message}
        </Alert>
      ) : null}
      {driverAvailability.gps.error ? (
        <Alert tone="warning" title="GPS update">
          {driverAvailability.gps.error}
        </Alert>
      ) : null}

      <section className={styles.mainGrid}>
        <article className={styles.requestPanel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Active ride/request</span>
              <h2>{request ? (hasActiveRide ? "Active ride" : "Incoming request") : isOnline ? "Waiting for request" : "Ready once online"}</h2>
            </div>
            <Badge tone={request ? "success" : isOnline ? "info" : "warning"}>
              {request ? (hasActiveRide ? formatStatus(request.lifecycleStatus) : `${request.route.pickupEtaMinutes} min pickup`) : isOnline ? "Online" : "Offline"}
            </Badge>
          </div>

          <div className={styles.routePreview} aria-label="Active request preview">
            <span className={styles.pickupMarker}>P</span>
            <span className={styles.dropoffMarker}>D</span>
            <div className={styles.routeLine} />
            <div className={styles.mapBadge}>
              {request ? `${request.route.pickupDistanceKm} km pickup` : "No active request"}
            </div>
          </div>

          <div className={styles.rideDetails}>
            <div>
              <span>Pickup</span>
              <strong>{request?.pickup.address ?? "Waiting for assigned pickup"}</strong>
            </div>
            <div>
              <span>Dropoff</span>
              <strong>{request?.dropoff.address ?? "Waiting for assigned dropoff"}</strong>
            </div>
            <dl>
              <div>
                <dt>Fare</dt>
                <dd>{request ? formatMoney(request.fare.totalFare) : "--"}</dd>
              </div>
              <div>
                <dt>ETA</dt>
                <dd>{request ? `${request.route.tripDurationMinutes} min` : "--"}</dd>
              </div>
              <div>
                <dt>Trust</dt>
                <dd>{request ? `${request.rider.fairPriceScore}%` : "--"}</dd>
              </div>
            </dl>
          </div>

          <div className={styles.requestActions}>
            <Button
              fullWidth
              type="button"
              variant="mint"
              disabled={!isOnline || !canAcceptRequest || rideRequests.isSaving}
              isLoading={rideRequests.isSaving}
              onClick={() => void rideRequests.acceptRequest()}
            >
              {hasActiveRide ? "Ride already active" : "Accept ride"}
            </Button>
            <Button
              fullWidth
              type="button"
              variant="secondary"
              disabled={!isOnline || !canAcceptRequest || rideRequests.isSaving}
              onClick={() => void rideRequests.declineRequest()}
            >
              Decline
            </Button>
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Availability controls</span>
              <h2>Location and zones</h2>
            </div>
            <Badge tone={availability?.guidance.canGoOnline ? "success" : "warning"}>
              {availability?.guidance.canGoOnline ? "Ready" : "Blocked"}
            </Badge>
          </div>
          <DriverLocationMap
            latitude={mapLatitude}
            longitude={mapLongitude}
            accuracyMeters={mapAccuracy}
            isFresh={locationFresh}
            label={availability?.currentLocation?.addressLabel ?? driverAvailability.locationForm.addressLabel}
          />
          <div className={styles.gpsPanel}>
            <div>
              <span>Device GPS</span>
              <strong>{driverAvailability.gps.isSharing ? "Sharing active" : "Ready to share"}</strong>
              <small>
                Permission {driverAvailability.gps.permissionState}. Last GPS sync {lastGpsLabel}.
              </small>
            </div>
            <Badge tone={driverAvailability.gps.isSupported ? "success" : "danger"}>
              {driverAvailability.gps.isSupported ? "Supported" : "Unsupported"}
            </Badge>
          </div>
          <div className={styles.formGrid}>
            <TextField
              label="Latitude"
              type="number"
              value={driverAvailability.locationForm.latitude}
              onChange={(event) =>
                driverAvailability.setLocationForm((current) => ({
                  ...current,
                  latitude: event.target.value,
                  source: "manual"
                }))
              }
            />
            <TextField
              label="Longitude"
              type="number"
              value={driverAvailability.locationForm.longitude}
              onChange={(event) =>
                driverAvailability.setLocationForm((current) => ({
                  ...current,
                  longitude: event.target.value,
                  source: "manual"
                }))
              }
            />
            <TextField
              label="Accuracy meters"
              type="number"
              value={driverAvailability.locationForm.accuracyMeters}
              onChange={(event) =>
                driverAvailability.setLocationForm((current) => ({
                  ...current,
                  accuracyMeters: event.target.value,
                  source: "manual"
                }))
              }
            />
            <TextField
              label="Address label"
              value={driverAvailability.locationForm.addressLabel}
              onChange={(event) =>
                driverAvailability.setLocationForm((current) => ({
                  ...current,
                  addressLabel: event.target.value,
                  source: "manual"
                }))
              }
            />
          </div>
          <label className={styles.field}>
            <span>Active service zones</span>
            <input
              value={driverAvailability.availabilityForm.activeServiceZones}
              onChange={(event) =>
                driverAvailability.setAvailabilityForm((current) => ({
                  ...current,
                  activeServiceZones: event.target.value
                }))
              }
            />
          </label>
          <div className={styles.locationState}>
            <span>Location sharing</span>
            <Badge tone={locationFresh ? "success" : "warning"}>
              {locationFresh ? "Fresh" : "Needs update"}
            </Badge>
          </div>
          <div className={styles.requestActions}>
            <Button
              fullWidth
              type="button"
              variant="mint"
              isLoading={driverAvailability.gps.isLocating || driverAvailability.isSaving}
              onClick={() => void driverAvailability.shareGpsLocation()}
            >
              Use device GPS
            </Button>
            <Button
              fullWidth
              type="button"
              variant="secondary"
              isLoading={driverAvailability.isSaving}
              onClick={() => void driverAvailability.shareLocation()}
            >
              Share manual location
            </Button>
          </div>
          <div className={styles.requestActions}>
            <Button fullWidth type="button" variant="secondary" isLoading={driverAvailability.isSaving} onClick={() => void driverAvailability.saveZones()}>
              Save zones
            </Button>
            <Button
              fullWidth
              type="button"
              variant="ghost"
              disabled={!driverAvailability.gps.isSharing}
              onClick={driverAvailability.gps.stopSharing}
            >
              Stop GPS sharing
            </Button>
          </div>
          {blockers.length ? (
            <div className={styles.warningList}>
              {blockers.map((blocker) => (
                <div className={styles.warningRow} key={blocker}>{blocker}</div>
              ))}
            </div>
          ) : null}
        </article>

        <article className={styles.card}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Earnings</span>
              <h2>Today summary</h2>
            </div>
            <Badge tone="trust">Live shift</Badge>
          </div>
          <div className={styles.earningsList}>
            {earnings.map((item) => (
              <div className={styles.statRow} key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.helper}</small>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Documents</span>
              <h2>Approval readiness</h2>
            </div>
            <Badge tone={documentIssues ? "warning" : "success"}>{documentIssues} pending</Badge>
          </div>
          <ProgressBar value={profile.documentPercent} label="Readiness" showValue tone={profile.documentPercent >= 80 ? "success" : "warning"} />
          <div className={styles.statusList}>
            {documentStatuses.map((item) => (
              <div className={styles.statusRow} key={item.label}>
                <span>{item.label}</span>
                <Badge tone={item.tone}>{item.status}</Badge>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Trust</span>
              <h2>Driver quality</h2>
            </div>
            <Badge tone={trust.trustScore >= 80 ? "success" : "warning"}>{trust.trustLevel}</Badge>
          </div>
          <div className={styles.trustScore}>
            <strong>{formatTrustScoreValue(trust.trustScore)}</strong>
            <span>/10</span>
          </div>
          <div className={styles.trustMetrics}>
            <div>
              <span>Route fairness</span>
              <strong>{trust.routeFairnessScore}%</strong>
            </div>
            <div>
              <span>Cancellation</span>
              <strong>{trust.cancellationRatio}%</strong>
            </div>
            <div>
              <span>On-time arrival</span>
              <strong>{trust.reliabilityScore}%</strong>
            </div>
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Notifications</span>
              <h2>Shift alerts</h2>
            </div>
            <Badge tone={driverNotifications.view.summary.unread ? "info" : "neutral"}>
              {driverNotifications.view.summary.unread} unread
            </Badge>
          </div>
          <div className={styles.notificationList}>
            {notifications.length ? notifications.map((item) => (
              <div className={styles.notificationRow} data-tone={notificationTone(item.priority)} key={item.id}>
                <strong>{item.title}</strong>
                <span>{item.message}</span>
              </div>
            )) : (
              <div className={styles.notificationRow} data-tone="neutral">
                <strong>No shift alerts yet</strong>
                <span>Ride, payout, document, and support alerts will appear here.</span>
              </div>
            )}
          </div>
        </article>
      </section>
    </section>
  );
}

const parseCoordinate = (primaryValue: number | null | undefined, fallbackValue: string) => {
  if (typeof primaryValue === "number" && Number.isFinite(primaryValue)) {
    return primaryValue;
  }

  const parsedValue = Number(fallbackValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));

const formatMoney = (value: number) => `Rs ${Math.round(value).toLocaleString("en-IN")}`;

const formatStatus = (value: string) => value.replace(/_/g, " ");

const formatTrustScore = (value: number) => (value > 0 ? `${formatTrustScoreValue(value)}/10` : "Not scored");

const formatTrustScoreValue = (value: number) => (Math.round(value) / 10).toFixed(1);

const statusTone = (status: string) => {
  if (status === "approved") {
    return "success" as const;
  }

  if (status === "missing" || status === "rejected") {
    return "warning" as const;
  }

  return "info" as const;
};

const notificationTone = (priority: string) => {
  if (priority === "urgent" || priority === "high") {
    return "warning";
  }

  if (priority === "low") {
    return "neutral";
  }

  return "info";
};
