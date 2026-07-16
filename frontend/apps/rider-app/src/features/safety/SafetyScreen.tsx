import { Alert, Badge, Button, Card, MetricCard } from "@good-rapido/ui";

import { useSafetyCenter } from "./useSafetyCenter";
import { getRideIdFromDraft } from "./safety.utils";
import styles from "./SafetyScreen.module.css";

export function SafetyScreen() {
  const { draft, supportSummary, currentRide, isLoading, isSending, message, loadSafety, sendSafetySignal } = useSafetyCenter();
  const activeRideId = getRideIdFromDraft(draft) ?? currentRide?.id ?? null;

  return (
    <section className={styles.root}>
      <Card className={styles.hero} variant="mint">
        <div className={styles.heroHeader}>
          <div>
            <p className={styles.eyebrow}>Safety Shield</p>
            <strong>{activeRideId ? "Active" : "Ready"}</strong>
          </div>
          <Badge tone={activeRideId ? "success" : "trust"}>{currentRide?.status ?? "protected"}</Badge>
        </div>
        <div className={styles.metrics}>
          <MetricCard label="Open Tickets" value={supportSummary?.openCount ?? 0} />
          <MetricCard label="Urgent" value={supportSummary?.urgentCount ?? 0} />
          <MetricCard label="Ride Link" value={activeRideId ? "linked" : "none"} />
        </div>
      </Card>

      {message ? (
        <Alert tone="info" title="Safety Update">
          {message}
        </Alert>
      ) : null}

      <Card className={styles.emergency} variant="danger">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Emergency Assistance</p>
            <h3>SOS escalation</h3>
          </div>
          <Badge tone="danger">urgent</Badge>
        </div>
        <Button
          variant="danger"
          size="lg"
          fullWidth
          isLoading={isSending}
          onClick={() => void sendSafetySignal(
            "SOS emergency assistance",
            "Rider requested immediate safety assistance from the active ride safety center.",
            true
          )}
        >
          SOS Emergency
        </Button>
      </Card>

      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Report An Issue</p>
            <h3>{activeRideId ? "Active ride support" : "General safety support"}</h3>
          </div>
          <Button size="sm" variant="secondary" isLoading={isLoading} onClick={() => void loadSafety()}>
            Refresh
          </Button>
        </div>
        <div className={styles.issueGrid}>
          <button
            type="button"
            onClick={() => void sendSafetySignal(
              "Wrong route or fake trip",
              "Rider reported a wrong route, fake trip, or suspicious ride activity from safety center.",
              true
            )}
          >
            <strong>Wrong route or fake trip</strong>
            <small>Create safety ticket</small>
          </button>
          <button
            type="button"
            onClick={() => void sendSafetySignal(
              "Driver requested offline payment",
              "Driver requested payment outside the app during a ride.",
              false
            )}
          >
            <strong>Offline payment request</strong>
            <small>Create safety ticket</small>
          </button>
          <button
            type="button"
            onClick={() => void sendSafetySignal(
              "Refund or payment safety help",
              "Rider needs urgent help for payment or refund concern connected with safety.",
              false
            )}
          >
            <strong>Refund or payment help</strong>
            <small>Create support ticket</small>
          </button>
          <button
            type="button"
            onClick={() => void sendSafetySignal(
              "Safety alert review",
              "Rider asked support to review missing or confusing safety alerts.",
              false
            )}
          >
            <strong>Safety alerts</strong>
            <small>Ask support to review</small>
          </button>
        </div>
      </Card>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => { window.location.hash = "/"; }}>
          Home
        </Button>
        <Button
          isLoading={isSending}
          onClick={() => void sendSafetySignal(
            "Safety support request",
            "Rider requested safety support from the safety center.",
            false
          )}
        >
          Contact Safety
        </Button>
      </div>
    </section>
  );
}
