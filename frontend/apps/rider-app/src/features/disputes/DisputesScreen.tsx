import { Alert, Badge, Button, Card, MetricCard, TextField } from "@good-rapido/ui";

import { useRiderDisputes } from "./useRiderDisputes";
import type { RiderDisputeItem, RiderDisputeRide } from "./disputes.types";
import styles from "./DisputesScreen.module.css";

const typeOptions = [
  ["fare_overcharge", "Fare overcharge"],
  ["wrong_route", "Wrong route"],
  ["fake_trip", "Fake trip"],
  ["payment_issue", "Payment issue"],
  ["safety_concern", "Safety concern"],
  ["other", "Other"]
] as const;

const reasonOptions = [
  ["fare_higher_than_quote", "Fare higher than quote"],
  ["surge_not_explained", "Surge not explained"],
  ["unnecessary_detour", "Unnecessary detour"],
  ["waiting_charge_incorrect", "Incorrect waiting charge"],
  ["offline_payment_requested", "Offline payment requested"],
  ["driver_did_not_arrive", "Driver no-show"],
  ["other", "Other"]
] as const;

const resolutionOptions = [
  ["fare_adjustment", "Fare adjustment"],
  ["refund", "Refund"],
  ["route_review", "Route review"],
  ["driver_review", "Driver review"],
  ["payment_review", "Payment review"],
  ["safety_review", "Safety review"],
  ["other", "Other"]
] as const;

export function DisputesScreen() {
  const disputes = useRiderDisputes();

  return (
    <section className={styles.root}>
      <Card className={styles.hero} variant="navy">
        <div className={styles.heroHeader}>
          <div>
            <p className={styles.eyebrow}>Dispute Center</p>
            <strong>{disputes.summary.openCount}</strong>
          </div>
          <Badge tone={disputes.summary.urgentCount ? "danger" : "trust"}>
            {disputes.summary.urgentCount} urgent
          </Badge>
        </div>
        <div className={styles.metrics}>
          <MetricCard label="Total" value={disputes.summary.totalDisputes} />
          <MetricCard label="Resolved" value={disputes.summary.resolvedCount} />
          <MetricCard label="Cancelled" value={disputes.summary.cancelledCount} />
        </div>
      </Card>

      {disputes.error ? (
        <Alert tone="danger" title="Dispute update failed">
          {disputes.error}
        </Alert>
      ) : null}
      {disputes.message ? (
        <Alert tone="info" title="Dispute update">
          {disputes.message}
        </Alert>
      ) : null}

      <section className={styles.layout}>
        <Card className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Create Dispute</p>
              <h3>Raise a ride review</h3>
            </div>
            <Button size="sm" variant="secondary" isLoading={disputes.isLoading} onClick={() => void disputes.loadDisputes()}>
              Refresh
            </Button>
          </div>

          <label className={styles.field}>
            <span>Completed ride</span>
            <select
              value={disputes.form.rideId}
              onChange={(event) => disputes.setForm((current) => ({ ...current, rideId: event.target.value }))}
            >
              {!disputes.rides.length ? <option value="">No completed rides available</option> : null}
              {disputes.rides.map((ride) => (
                <option key={ride.id} value={ride.id}>
                  {formatRideLabel(ride)}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.formGrid}>
            <SelectField
              label="Type"
              value={disputes.form.type}
              options={typeOptions}
              onChange={(value) => disputes.setForm((current) => ({ ...current, type: value }))}
            />
            <SelectField
              label="Reason"
              value={disputes.form.reason}
              options={reasonOptions}
              onChange={(value) => disputes.setForm((current) => ({ ...current, reason: value }))}
            />
          </div>

          <TextField
            label="Title"
            value={disputes.form.title}
            onChange={(event) => disputes.setForm((current) => ({ ...current, title: event.target.value }))}
          />
          <label className={styles.field}>
            <span>Description</span>
            <textarea
              value={disputes.form.description}
              onChange={(event) => disputes.setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>

          <div className={styles.formGrid}>
            <SelectField
              label="Requested resolution"
              value={disputes.form.requestedResolution}
              options={resolutionOptions}
              onChange={(value) => disputes.setForm((current) => ({ ...current, requestedResolution: value }))}
            />
            <TextField
              label="Requested amount"
              type="number"
              value={disputes.form.requestedRefundAmount}
              onChange={(event) => disputes.setForm((current) => ({ ...current, requestedRefundAmount: event.target.value }))}
            />
          </div>

          <label className={styles.field}>
            <span>Evidence note</span>
            <textarea
              value={disputes.form.evidenceNote}
              onChange={(event) => disputes.setForm((current) => ({ ...current, evidenceNote: event.target.value }))}
            />
          </label>

          <Button
            fullWidth
            isLoading={disputes.isSaving}
            disabled={!disputes.rides.length || !disputes.form.rideId}
            onClick={() => void disputes.submitDispute()}
          >
            Submit Dispute
          </Button>
        </Card>

        <Card className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Ticket Status</p>
              <h3>Dispute history</h3>
            </div>
            <Badge tone={disputes.disputes.length ? "info" : "neutral"}>{disputes.disputes.length} records</Badge>
          </div>

          <div className={styles.disputeList}>
            {disputes.disputes.map((dispute) => (
              <DisputeCard
                dispute={dispute}
                isSaving={disputes.isSaving}
                key={dispute.id}
                onAddEvidence={() => void disputes.addEvidence(dispute.id)}
                onCancel={() => void disputes.cancelDispute(dispute.id)}
              />
            ))}
            {!disputes.disputes.length ? (
              <div className={styles.emptyState}>
                <strong>No disputes yet.</strong>
                <span>Create a dispute after a completed ride if fare, route, refund, or safety signals need review.</span>
              </div>
            ) : null}
          </div>
        </Card>
      </section>
    </section>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: readonly (readonly [string, string])[];
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>{labelText}</option>
        ))}
      </select>
    </label>
  );
}

function DisputeCard({
  dispute,
  isSaving,
  onAddEvidence,
  onCancel
}: {
  dispute: RiderDisputeItem;
  isSaving: boolean;
  onAddEvidence: () => void;
  onCancel: () => void;
}) {
  const canAct = ["submitted", "under_review", "evidence_requested"].includes(dispute.status);

  return (
    <article className={styles.disputeCard}>
      <div className={styles.disputeHeader}>
        <span>
          <small>{dispute.disputeCode ?? dispute.bookingCode ?? "Dispute"}</small>
          <strong>{dispute.title ?? formatLabel(dispute.reason ?? "ride review")}</strong>
        </span>
        <Badge tone={dispute.priority === "urgent" ? "danger" : statusTone(dispute.status)}>{formatLabel(dispute.status)}</Badge>
      </div>
      <div className={styles.disputeMeta}>
        <span>Evidence: {dispute.evidenceCount}</span>
        <span>Requested: {formatCurrency(dispute.requestedRefundAmount, dispute.currency)}</span>
        <span>{formatDateTime(dispute.latestActivityAt)}</span>
      </div>
      <div className={styles.disputeActions}>
        <Button size="sm" variant="secondary" disabled={!canAct} isLoading={isSaving} onClick={onAddEvidence}>
          Add Evidence
        </Button>
        <Button size="sm" variant="danger" disabled={!canAct} isLoading={isSaving} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </article>
  );
}

const formatRideLabel = (ride: RiderDisputeRide) =>
  `${ride.bookingCode} - ${ride.pickup.address ?? "Pickup"} to ${ride.dropoff.address ?? "Dropoff"} - ${formatCurrency(ride.totalFare, ride.currency)}`;

const formatLabel = (value: string) => value.replace(/_/g, " ");

const formatCurrency = (amount: number | null, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amount ?? 0);

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "No activity yet";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};

const statusTone = (status: string) => {
  if (status === "resolved") {
    return "success";
  }

  if (status === "rejected" || status === "cancelled") {
    return "danger";
  }

  return "warning";
};
