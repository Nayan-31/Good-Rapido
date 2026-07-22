import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, MetricCard, ProgressBar } from "@good-rapido/ui";

import { findOpsRouteById } from "@/routes";
import { rideOpsService } from "./rideOps.service";
import type { RideOpsFilters, RideOpsOptions, RideOpsQueueItem, RideOpsSummary } from "./rideOps.types";
import styles from "./RideOpsScreen.module.css";

const route = findOpsRouteById("rideOps");

const defaultFilters: RideOpsFilters = {
  status: "all",
  priority: "all",
  issueStatus: "all",
  query: ""
};

const fallbackOptions: RideOpsOptions = {
  filters: ["all", "pending_confirmation", "active", "driver_en_route", "driver_arrived", "in_progress", "completed", "cancelled", "high_risk"],
  bookingStatuses: ["driver_search", "driver_selected", "confirmed", "cancelled"],
  lifecycleStatuses: ["pending_confirmation", "driver_en_route", "driver_arrived", "in_progress", "completed", "cancelled"],
  vehicleTypes: ["bike", "auto", "cab_economy", "cab_premium"],
  cancellationReasons: ["driver_late", "price_changed", "changed_plans", "safety_concern", "wrong_pickup", "other"],
  riskLevels: ["low", "medium", "high"],
  priorityLevels: ["normal", "high", "urgent"],
  issueStatuses: ["none", "monitoring", "escalated", "resolved"],
  actions: ["assign_owner", "update_priority", "update_issue_status", "reassign_driver", "confirm_ride", "cancel_ride", "add_note"]
};

const emptySummary: RideOpsSummary = {
  totalRides: 0,
  pendingConfirmation: 0,
  activeRides: 0,
  completedRides: 0,
  cancelledRides: 0,
  highRiskRides: 0,
  escalatedRides: 0,
  urgentRides: 0,
  averageFare: 0
};

export function RideOpsScreen() {
  const [filters, setFilters] = useState(defaultFilters);
  const [options, setOptions] = useState<RideOpsOptions>(fallbackOptions);
  const [summary, setSummary] = useState<RideOpsSummary>(emptySummary);
  const [rides, setRides] = useState<RideOpsQueueItem[]>([]);
  const [selectedRide, setSelectedRide] = useState<RideOpsQueueItem | null>(null);
  const [opsPriority, setOpsPriority] = useState("normal");
  const [opsIssueStatus, setOpsIssueStatus] = useState("monitoring");
  const [opsNote, setOpsNote] = useState("Ops reviewed lifecycle exception");
  const [confirmNote, setConfirmNote] = useState("Rider confirmed over ops call");
  const [cancelReason, setCancelReason] = useState("driver_late");
  const [cancelNote, setCancelNote] = useState("Cancelled by ops after support review");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRideOps = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [nextOptions, dashboard, queue] = await Promise.all([
        rideOpsService.getOptions(),
        rideOpsService.getDashboard(),
        rideOpsService.listRides(filters)
      ]);

      setOptions(nextOptions ?? fallbackOptions);
      setSummary({
        ...emptySummary,
        ...(dashboard?.summary ?? {}),
        ...(queue?.summary ?? {})
      });
      setRides(queue?.rides ?? dashboard?.queue ?? []);
    } catch (caughtError) {
      setError(resolveErrorMessage(caughtError));
      setRides([]);
      setSummary(emptySummary);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadRideOps();
  }, [loadRideOps]);

  useEffect(() => {
    if (!selectedRide || rides.some((ride) => ride.id === selectedRide.id)) {
      return;
    }

    setSelectedRide(null);
  }, [rides, selectedRide]);

  useEffect(() => {
    if (!options.cancellationReasons.includes(cancelReason)) {
      setCancelReason(options.cancellationReasons[0] ?? "other");
    }
  }, [cancelReason, options.cancellationReasons]);

  const lifecycleExceptions = useMemo(() => rides.filter((ride) => (
    ride.risk.needsAttention
    || ride.ops.priority === "urgent"
    || ride.ops.issueStatus === "escalated"
    || ride.lifecycleStatus === "pending_confirmation"
  )), [rides]);

  const selectedCanWrite = Boolean(selectedRide);

  const openRideDetail = async (ride: RideOpsQueueItem) => {
    setPendingAction(`detail:${ride.id}`);
    setError(null);

    try {
      const detail = await rideOpsService.getRide(ride.id);
      setSelectedRide(detail ?? ride);
      setMessage(`Opened ${ride.bookingCode || ride.id}`);
    } catch (caughtError) {
      setSelectedRide(ride);
      setError(resolveErrorMessage(caughtError));
    } finally {
      setPendingAction(null);
    }
  };

  const updateSelectedRide = (ride: RideOpsQueueItem | undefined, actionMessage: string) => {
    if (ride) {
      setSelectedRide(ride);
      setRides((currentRides) => currentRides.map((item) => item.id === ride.id ? ride : item));
    }

    setMessage(actionMessage);
    void loadRideOps();
  };

  const runRideAction = async (actionName: string, action: () => Promise<RideOpsQueueItem | undefined>, successMessage: string) => {
    if (!selectedRide) {
      return;
    }

    setPendingAction(actionName);
    setError(null);
    setMessage(null);

    try {
      const updatedRide = await action();
      updateSelectedRide(updatedRide, successMessage);
    } catch (caughtError) {
      setError(resolveErrorMessage(caughtError));
    } finally {
      setPendingAction(null);
    }
  };

  const handleOpsStateUpdate = () => runRideAction(
    "ops-state",
    () => rideOpsService.updateOpsState(selectedRide?.id ?? "", {
      priority: opsPriority,
      issueStatus: opsIssueStatus,
      note: opsNote.trim() || "Ops state reviewed"
    }),
    "Ops state updated from dashboard"
  );

  const handleConfirmRide = () => runRideAction(
    "confirm",
    () => rideOpsService.confirmRide(selectedRide?.id ?? "", confirmNote),
    "Ride confirmed successfully"
  );

  const handleReassignDriver = () => runRideAction(
    "reassign",
    () => rideOpsService.reassignDriver(selectedRide?.id ?? ""),
    "Driver reassigned to verified backup"
  );

  const handleCancelRide = () => runRideAction(
    "cancel",
    () => rideOpsService.cancelRide(selectedRide?.id ?? "", cancelReason, cancelNote),
    "Ride cancelled by ops"
  );

  return (
    <section className={styles.screen}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Ride Operations</span>
          <h1>Control live ride queues, assignment exceptions, and lifecycle decisions</h1>
          <p>
            Connected with {route.backendModules.join(", ")} for queue filters, ride detail review, confirmation,
            driver reassignment, cancellation, and ops-state updates.
          </p>
        </div>
        <div className={styles.heroActions}>
          <Button type="button" onClick={() => void loadRideOps()} isLoading={isLoading}>Refresh Queue</Button>
          <Badge tone={error ? "danger" : "trust"}>{error ? "Needs auth/data" : "Backend wired"}</Badge>
        </div>
      </section>

      <section className={styles.metrics} aria-label="Ride operations summary">
        <MetricCard label="Queue Total" value={String(summary.totalRides)} meta="private/ride-ops/rides" tone="navy" />
        <MetricCard label="Pending Confirm" value={String(summary.pendingConfirmation)} meta="driver selected" tone="warning" />
        <MetricCard label="Active Rides" value={String(summary.activeRides)} meta="live lifecycle" tone="trust" />
        <MetricCard label="High Risk" value={String(summary.highRiskRides)} meta={`${summary.escalatedRides} escalated`} tone="danger" />
      </section>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}
      {message ? <div className={styles.successBanner}>{message}</div> : null}

      <Card padding="lg" className={styles.filterPanel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>Filters</span>
            <h2>Ride queue controls</h2>
          </div>
          <Badge tone="info">{isLoading ? "loading" : `${rides.length} rides`}</Badge>
        </div>
        <div className={styles.filterGrid}>
          <label>
            <span>Status</span>
            <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              {options.filters.map((filter) => <option key={filter} value={filter}>{formatLabel(filter)}</option>)}
            </select>
          </label>
          <label>
            <span>Priority</span>
            <select value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}>
              <option value="all">All</option>
              {options.priorityLevels.map((priority) => <option key={priority} value={priority}>{formatLabel(priority)}</option>)}
            </select>
          </label>
          <label>
            <span>Issue</span>
            <select value={filters.issueStatus} onChange={(event) => setFilters((current) => ({ ...current, issueStatus: event.target.value }))}>
              <option value="all">All</option>
              {options.issueStatuses.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
            </select>
          </label>
          <label>
            <span>Search</span>
            <input
              value={filters.query}
              placeholder="Booking, pickup, driver"
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            />
          </label>
        </div>
      </Card>

      <section className={styles.workspace}>
        <Card padding="lg" className={styles.queuePanel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Queue Table</span>
              <h2>Live ride operations</h2>
            </div>
            <Badge tone="navy">GET /rides</Badge>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ride</th>
                  <th>Route</th>
                  <th>Driver</th>
                  <th>Fare</th>
                  <th>Risk</th>
                  <th>Ops</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rides.map((ride) => (
                  <tr key={ride.id} className={selectedRide?.id === ride.id ? styles.activeRow : undefined}>
                    <td>
                      <strong>{ride.bookingCode || ride.id}</strong>
                      <span>{formatLabel(ride.lifecycleStatus)}</span>
                    </td>
                    <td>
                      <strong>{ride.pickup.address || "Pickup pending"}</strong>
                      <span>{ride.dropoff.address || "Dropoff pending"}</span>
                    </td>
                    <td>
                      <strong>{ride.driver.fullName || "Unassigned"}</strong>
                      <span>{ride.driver.vehicleNumber || formatLabel(ride.vehicleType)}</span>
                    </td>
                    <td>
                      <strong>{formatCurrency(ride.fare.totalFare)}</strong>
                      <span>{ride.fare.distanceKm} km, {ride.fare.durationMinutes} min</span>
                    </td>
                    <td>
                      <Badge tone={ride.risk.needsAttention ? "danger" : "success"}>
                        {ride.risk.needsAttention ? "Review" : "Clear"}
                      </Badge>
                      <span>{ride.risk.cancellationRiskScore}% cancel risk</span>
                    </td>
                    <td>
                      <Badge tone={toneForPriority(ride.ops.priority)}>{formatLabel(ride.ops.priority)}</Badge>
                      <span>{formatLabel(ride.ops.issueStatus)}</span>
                    </td>
                    <td>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        isLoading={pendingAction === `detail:${ride.id}`}
                        onClick={() => void openRideDetail(ride)}
                      >
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))}
                {!rides.length ? (
                  <tr>
                    <td colSpan={7} className={styles.emptyCell}>
                      {isLoading ? "Loading ride queue..." : "No rides found for this filter. Create rider bookings to operate real data here."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <aside className={styles.drawer}>
          <Card padding="lg" className={styles.detailPanel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>Ride Detail Drawer</span>
                <h2>{selectedRide?.bookingCode || "Select a ride"}</h2>
              </div>
              <Badge tone={selectedRide ? "trust" : "neutral"}>{selectedRide ? formatLabel(selectedRide.bookingStatus) : "waiting"}</Badge>
            </div>

            {selectedRide ? (
              <>
                <div className={styles.routeCard}>
                  <div>
                    <span>Pickup</span>
                    <strong>{selectedRide.pickup.address || "Not available"}</strong>
                  </div>
                  <div>
                    <span>Dropoff</span>
                    <strong>{selectedRide.dropoff.address || "Not available"}</strong>
                  </div>
                </div>

                <div className={styles.detailGrid}>
                  <div>
                    <span>Driver</span>
                    <strong>{selectedRide.driver.fullName || "Unassigned"}</strong>
                  </div>
                  <div>
                    <span>Fare</span>
                    <strong>{formatCurrency(selectedRide.fare.totalFare)}</strong>
                  </div>
                  <div>
                    <span>Vehicle</span>
                    <strong>{formatLabel(selectedRide.vehicleType)}</strong>
                  </div>
                  <div>
                    <span>Next Action</span>
                    <strong>{selectedRide.guidance.nextAction}</strong>
                  </div>
                </div>

                <div className={styles.progressBlock}>
                  <ProgressBar value={progressFromStatus(selectedRide.lifecycleStatus)} label={formatLabel(selectedRide.lifecycleStatus)} showValue tone="trust" />
                </div>

                <section className={styles.actionStack}>
                  <div className={styles.formBlock}>
                    <div className={styles.inlineFields}>
                      <label>
                        <span>Priority</span>
                        <select value={opsPriority} onChange={(event) => setOpsPriority(event.target.value)}>
                          {options.priorityLevels.map((priority) => <option key={priority} value={priority}>{formatLabel(priority)}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>Issue</span>
                        <select value={opsIssueStatus} onChange={(event) => setOpsIssueStatus(event.target.value)}>
                          {options.issueStatuses.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
                        </select>
                      </label>
                    </div>
                    <label>
                      <span>Ops note</span>
                      <input value={opsNote} onChange={(event) => setOpsNote(event.target.value)} />
                    </label>
                    <Button type="button" variant="secondary" isLoading={pendingAction === "ops-state"} onClick={() => void handleOpsStateUpdate()}>
                      Update Ops State
                    </Button>
                  </div>

                  <div className={styles.formBlock}>
                    <label>
                      <span>Confirm note</span>
                      <input value={confirmNote} onChange={(event) => setConfirmNote(event.target.value)} />
                    </label>
                    <Button
                      type="button"
                      disabled={!selectedCanWrite || !selectedRide.guidance.canConfirm}
                      isLoading={pendingAction === "confirm"}
                      onClick={() => void handleConfirmRide()}
                    >
                      Confirm Ride
                    </Button>
                  </div>

                  <Button
                    type="button"
                    variant="mint"
                    disabled={!selectedCanWrite || !selectedRide.guidance.canReassignDriver}
                    isLoading={pendingAction === "reassign"}
                    onClick={() => void handleReassignDriver()}
                  >
                    Reassign Verified Driver
                  </Button>

                  <div className={styles.formBlock}>
                    <div className={styles.inlineFields}>
                      <label>
                        <span>Cancel reason</span>
                        <select value={cancelReason} onChange={(event) => setCancelReason(event.target.value)}>
                          {options.cancellationReasons.map((reason) => <option key={reason} value={reason}>{formatLabel(reason)}</option>)}
                        </select>
                      </label>
                    </div>
                    <label>
                      <span>Cancel note</span>
                      <input value={cancelNote} onChange={(event) => setCancelNote(event.target.value)} />
                    </label>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={!selectedCanWrite || !selectedRide.guidance.canCancel}
                      isLoading={pendingAction === "cancel"}
                      onClick={() => void handleCancelRide()}
                    >
                      Cancel Ride
                    </Button>
                  </div>
                </section>
              </>
            ) : (
              <p className={styles.emptyDetail}>Open any queue row to review lifecycle, rider route, driver snapshot, and action history.</p>
            )}
          </Card>
        </aside>
      </section>

      <Card padding="lg" className={styles.exceptionPanel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>Lifecycle Exception View</span>
            <h2>Rides that need human review</h2>
          </div>
          <Badge tone={lifecycleExceptions.length ? "warning" : "success"}>{lifecycleExceptions.length} open</Badge>
        </div>
        <div className={styles.exceptionGrid}>
          {lifecycleExceptions.slice(0, 4).map((ride) => (
            <button type="button" key={ride.id} className={styles.exceptionCard} onClick={() => void openRideDetail(ride)}>
              <span>{ride.bookingCode || ride.id}</span>
              <strong>{ride.guidance.nextAction}</strong>
              <small>{formatLabel(ride.lifecycleStatus)} - {formatLabel(ride.ops.issueStatus)}</small>
            </button>
          ))}
          {!lifecycleExceptions.length ? (
            <div className={styles.emptyException}>No lifecycle exceptions in the current queue.</div>
          ) : null}
        </div>
      </Card>
    </section>
  );
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

const formatLabel = (value: string | null | undefined) =>
  (value || "not_available").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const toneForPriority = (priority: string) => {
  if (priority === "urgent") {
    return "danger";
  }

  if (priority === "high") {
    return "warning";
  }

  return "trust";
};

const progressFromStatus = (status: string) => ({
  pending_confirmation: 12,
  driver_en_route: 34,
  driver_arrived: 48,
  in_progress: 76,
  completed: 100,
  cancelled: 0
}[status] ?? 15);

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Ride operations request failed";
};
