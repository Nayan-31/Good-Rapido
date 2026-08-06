import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Button, Card, MetricCard, ProgressBar } from "@good-rapido/ui";

import { rideFlowStorage } from "@/features/booking/rideFlowStorage";
import type { RideFlowDraft } from "@/features/booking/rideFlowStorage";
import { formatCurrency, formatVehicleType } from "@/features/pricing/pricing.utils";
import { confirmRideService } from "./confirmRide.service";
import type { RideBooking, RideLifecycleView } from "./confirmRide.types";
import styles from "./LiveRideScreen.module.css";

const LIVE_RIDE_POLL_MS = 5000;
const TERMINAL_LIFECYCLE_STATUSES = new Set(["completed", "cancelled"]);
type LiveConnectionState = "connecting" | "live" | "fallback";

export function LiveRideScreen() {
  const [draft, setDraft] = useState<RideFlowDraft | null>(() => rideFlowStorage.read());
  const [booking, setBooking] = useState<RideBooking | null>(() => (rideFlowStorage.read()?.booking as RideBooking | undefined) ?? null);
  const bookingRef = useRef<RideBooking | null>(booking);
  const [lifecycle, setLifecycle] = useState<RideLifecycleView | null>(() => (rideFlowStorage.read()?.lifecycle as RideLifecycleView | undefined) ?? null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionState, setConnectionState] = useState<LiveConnectionState>("connecting");
  const lifecycleStatus = lifecycle?.lifecycleStatus ?? "pending_confirmation";
  const isTerminalRide = TERMINAL_LIFECYCLE_STATUSES.has(lifecycleStatus);

  useEffect(() => {
    bookingRef.current = booking;
  }, [booking]);

  const applyLifecycleUpdate = useCallback((nextLifecycle: RideLifecycleView) => {
    const currentDraft = rideFlowStorage.read();
    const currentBooking = (currentDraft?.booking as RideBooking | undefined) ?? bookingRef.current;
    const nextBooking = currentBooking ? mergeBookingFromLifecycle(currentBooking, nextLifecycle) : bookingRef.current;
    const nextDraft = rideFlowStorage.update({
      booking: nextBooking,
      lifecycle: nextLifecycle
    });

    bookingRef.current = nextBooking;
    setBooking(nextBooking);
    setLifecycle(nextLifecycle);
    setDraft(nextDraft ?? currentDraft);
    setLastSyncedAt(new Date().toISOString());
    setSyncError(null);
  }, []);

  const syncLifecycle = useCallback(async (mode: "manual" | "silent" = "silent") => {
    const bookingId = booking?.id;

    if (!bookingId) {
      return;
    }

    if (mode === "manual") {
      setIsSyncing(true);
    }

    try {
      const response = await confirmRideService.getLifecycle(bookingId);
      const nextLifecycle = response.data?.lifecycle ?? null;

      if (!nextLifecycle) {
        return;
      }

      applyLifecycleUpdate(nextLifecycle);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Unable to sync live ride status");
    } finally {
      if (mode === "manual") {
        setIsSyncing(false);
      }
    }
  }, [applyLifecycleUpdate, booking?.id]);

  useEffect(() => {
    if (!booking?.id || isTerminalRide) {
      return;
    }

    const controller = new AbortController();

    setConnectionState("connecting");
    void confirmRideService.streamLifecycle(booking.id, {
      signal: controller.signal,
      onOpen: () => setConnectionState("live"),
      onLifecycle: applyLifecycleUpdate,
      onError: (message) => {
        setConnectionState("fallback");
        setSyncError(message);
      }
    }).catch((error) => {
      if (controller.signal.aborted) {
        return;
      }

      setConnectionState("fallback");
      setSyncError(error instanceof Error ? error.message : "Live updates unavailable; using periodic refresh.");
    });

    return () => controller.abort();
  }, [applyLifecycleUpdate, booking?.id, isTerminalRide]);

  useEffect(() => {
    if (!booking?.id || isTerminalRide || connectionState === "live") {
      return;
    }

    void syncLifecycle();
    const intervalId = window.setInterval(() => {
      void syncLifecycle();
    }, LIVE_RIDE_POLL_MS);

    return () => window.clearInterval(intervalId);
  }, [booking?.id, connectionState, isTerminalRide, syncLifecycle]);

  const rideStateLabel = useMemo(
    () => resolveRideStateLabel(booking?.status, lifecycleStatus),
    [booking?.status, lifecycleStatus]
  );
  const syncLabel = resolveSyncLabel(connectionState, lastSyncedAt);

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

  const progress = lifecycle?.progress?.percentage ?? 24;
  const currentStep = lifecycle?.progress?.currentStep ?? "Waiting for driver confirmation";
  const nextAction = lifecycle?.progress?.nextAction ?? "Your matched driver can accept this request from the driver app.";
  const pickupAddress = lifecycle?.ride.pickup.address
    ?? booking.pickup.address
    ?? draft?.form.pickup.address
    ?? "Pickup selected";
  const dropoffAddress = lifecycle?.ride.dropoff.address
    ?? booking.dropoff.address
    ?? draft?.form.dropoff.address
    ?? "Dropoff selected";

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
              <b>{pickupAddress}</b>
            </p>
          </div>
          <div>
            <span className={`${styles.dot} ${styles.dropDot}`} />
            <p>
              <small>Dropoff</small>
              <b>{dropoffAddress}</b>
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
          <div className={styles.syncActions}>
            <Badge tone={connectionState === "live" ? "success" : "warning"}>
              {connectionState === "live" ? "Live" : "Syncing"}
            </Badge>
            <Badge tone="trust">{formatVehicleType(booking.vehicleType)}</Badge>
            <Button
              size="sm"
              variant="secondary"
              isLoading={isSyncing}
              onClick={() => void syncLifecycle("manual")}
            >
              Refresh
            </Button>
          </div>
        </div>
        <ProgressBar value={progress} label="Ride Progress" showValue />
        <p className={styles.copy}>{nextAction}</p>
        <div className={styles.syncRow}>
          <Badge tone={booking.status === "confirmed" ? "success" : "warning"}>
            {booking.status === "confirmed" ? "Driver accepted" : "Waiting for driver"}
          </Badge>
          <span>{syncLabel}</span>
        </div>
      </Card>

      {syncError ? (
        <Alert tone="warning" title="Live Status Update">
          {syncError}
        </Alert>
      ) : null}

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

const mergeBookingFromLifecycle = (booking: RideBooking, lifecycle: RideLifecycleView): RideBooking => ({
  ...booking,
  status: lifecycle.ride.bookingStatus ?? booking.status,
  vehicleType: lifecycle.ride.vehicleType ?? booking.vehicleType,
  pickup: lifecycle.ride.pickup ?? booking.pickup,
  dropoff: lifecycle.ride.dropoff ?? booking.dropoff,
  selectedDriver: lifecycle.ride.driver ?? booking.selectedDriver,
  fareSnapshot: lifecycle.ride.fare ?? booking.fareSnapshot,
  trustSignals: lifecycle.ride.trustSignals ?? booking.trustSignals
});

const resolveRideStateLabel = (bookingStatus: string | null | undefined, lifecycleStatus: string) => {
  if (lifecycleStatus === "driver_en_route") {
    return "Driver Accepted";
  }

  if (lifecycleStatus === "driver_arrived") {
    return "Driver Arrived";
  }

  if (lifecycleStatus === "in_progress") {
    return "Ride In Progress";
  }

  if (lifecycleStatus === "completed") {
    return "Ride Completed";
  }

  if (bookingStatus === "confirmed") {
    return "Booking Confirmed";
  }

  return "Ride Requested";
};

const formatSyncTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));

const resolveSyncLabel = (connectionState: LiveConnectionState, lastSyncedAt: string | null) => {
  const timeLabel = lastSyncedAt ? formatSyncTime(lastSyncedAt) : null;

  if (connectionState === "live") {
    return timeLabel ? `Live updates connected · ${timeLabel}` : "Live updates connected";
  }

  if (connectionState === "fallback") {
    return timeLabel ? `Using periodic refresh · ${timeLabel}` : "Using periodic refresh";
  }

  return timeLabel ? `Connecting live updates · ${timeLabel}` : "Connecting live updates";
};
