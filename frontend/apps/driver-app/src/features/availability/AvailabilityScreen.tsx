import { useState } from "react";

import { Badge, Button, ProgressBar } from "@good-rapido/ui";
import styles from "./AvailabilityScreen.module.css";

const earnings = [
  { label: "Completed rides", value: "8", helper: "2 rides left for bonus" },
  { label: "Online time", value: "5h 20m", helper: "Peak slot active" },
  { label: "Payout status", value: "Ready", helper: "Settles tonight" }
];

const documentStatuses = [
  { label: "Driving license", status: "Verified", tone: "success" as const },
  { label: "Vehicle RC", status: "Verified", tone: "success" as const },
  { label: "Insurance", status: "Action needed", tone: "warning" as const },
  { label: "Police KYC", status: "In review", tone: "info" as const }
];

const notifications = [
  { title: "Insurance expires in 12 days", meta: "Upload renewed policy", tone: "warning" },
  { title: "High demand near Sector V", meta: "Expected request wait under 3 min", tone: "success" },
  { title: "Weekly payout ready", meta: "Rs 6,420 scheduled", tone: "info" }
];

export function AvailabilityScreen() {
  const [isOnline, setIsOnline] = useState(false);

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
            onClick={() => setIsOnline((current) => !current)}
          >
            <span />
            {isOnline ? "Go offline" : "Go online"}
          </button>
        </div>

        <div className={styles.summaryGrid}>
          <article className={styles.summaryCard} data-tone="earnings">
            <span>Today earnings</span>
            <strong>Rs 2,840</strong>
            <small>Rs 420 peak incentive included</small>
          </article>
          <article className={styles.summaryCard} data-tone="trust">
            <span>Trust score</span>
            <strong>9.4/10</strong>
            <small>Priority request eligible</small>
          </article>
          <article className={styles.summaryCard} data-tone="docs">
            <span>Document status</span>
            <strong>75%</strong>
            <small>1 item needs renewal</small>
          </article>
        </div>
      </section>

      <section className={styles.mainGrid}>
        <article className={styles.requestPanel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Active ride/request</span>
              <h2>{isOnline ? "Request waiting" : "Ready once online"}</h2>
            </div>
            <Badge tone={isOnline ? "success" : "warning"}>{isOnline ? "18 sec left" : "Offline"}</Badge>
          </div>

          <div className={styles.routePreview} aria-label="Active request preview">
            <span className={styles.pickupMarker}>P</span>
            <span className={styles.dropoffMarker}>D</span>
            <div className={styles.routeLine} />
            <div className={styles.mapBadge}>2.4 km pickup</div>
          </div>

          <div className={styles.rideDetails}>
            <div>
              <span>Pickup</span>
              <strong>Salt Lake Sector V</strong>
            </div>
            <div>
              <span>Dropoff</span>
              <strong>Howrah Station Gate 2</strong>
            </div>
            <dl>
              <div>
                <dt>Fare</dt>
                <dd>Rs 342</dd>
              </div>
              <div>
                <dt>ETA</dt>
                <dd>6 min</dd>
              </div>
              <div>
                <dt>Trust</dt>
                <dd>98%</dd>
              </div>
            </dl>
          </div>

          <div className={styles.requestActions}>
            <Button fullWidth type="button" variant="mint" disabled={!isOnline}>
              Accept ride
            </Button>
            <Button fullWidth type="button" variant="secondary" disabled={!isOnline}>
              Decline
            </Button>
          </div>
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
            <Badge tone="warning">1 pending</Badge>
          </div>
          <ProgressBar value={75} label="Readiness" showValue tone="warning" />
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
            <Badge tone="success">Elite</Badge>
          </div>
          <div className={styles.trustScore}>
            <strong>9.4</strong>
            <span>/10</span>
          </div>
          <div className={styles.trustMetrics}>
            <div>
              <span>Route fairness</span>
              <strong>98%</strong>
            </div>
            <div>
              <span>Cancellation</span>
              <strong>1.8%</strong>
            </div>
            <div>
              <span>On-time arrival</span>
              <strong>96%</strong>
            </div>
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Notifications</span>
              <h2>Shift alerts</h2>
            </div>
            <Badge tone="info">3 new</Badge>
          </div>
          <div className={styles.notificationList}>
            {notifications.map((item) => (
              <div className={styles.notificationRow} data-tone={item.tone} key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.meta}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}
