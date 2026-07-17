import { Badge, Button } from "@good-rapido/ui";
import type { BadgeTone, ButtonVariant } from "@good-rapido/ui";

import styles from "./EmptyScreen.module.css";

export interface DriverMetric {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "warning" | "danger" | "navy";
}

export interface DriverPanel {
  title: string;
  items: Array<{
    label: string;
    value: string;
    tone?: BadgeTone;
  }>;
}

export interface DriverRoutePreview {
  pickup: string;
  dropoff: string;
  eta: string;
  distance: string;
  fare: string;
}

export interface EmptyScreenProps {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  badgeTone?: BadgeTone;
  visualLabel?: string;
  visualVariant?: "auth" | "setup" | "online" | "request" | "ride" | "earnings" | "trust" | "profile";
  routePreview?: DriverRoutePreview;
  metrics?: DriverMetric[];
  panels?: DriverPanel[];
  primaryAction?: string;
  secondaryAction?: string;
  primaryVariant?: ButtonVariant;
}

export function EmptyScreen({
  eyebrow,
  title,
  description,
  badge = "Ready",
  badgeTone = "neutral",
  visualLabel = "Driver operations",
  visualVariant = "online",
  routePreview,
  metrics = [],
  panels = [],
  primaryAction = "Continue",
  secondaryAction = "View details",
  primaryVariant = "primary"
}: EmptyScreenProps) {
  return (
    <section className={styles.screen}>
      <aside className={styles.controlPanel}>
        <div className={styles.header}>
          <Badge tone={badgeTone}>{badge}</Badge>
          <p className={styles.eyebrow}>{eyebrow}</p>
        </div>
        <h1>{title}</h1>
        <p className={styles.description}>{description}</p>
        {metrics.length ? (
          <div className={styles.metrics}>
            {metrics.map((metric) => (
              <div className={styles.metric} data-tone={metric.tone ?? "default"} key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                {metric.hint ? <small>{metric.hint}</small> : null}
              </div>
            ))}
          </div>
        ) : null}
        <div className={styles.actions}>
          <Button type="button" variant={primaryVariant}>
            {primaryAction}
          </Button>
          <Button type="button" variant="ghost">
            {secondaryAction}
          </Button>
        </div>
      </aside>

      <section className={styles.visualPanel} data-variant={visualVariant} aria-label={visualLabel}>
        <div className={styles.mapSurface}>
          <div className={styles.routeLine} />
          <span className={styles.markerStart}>A</span>
          <span className={styles.markerEnd}>B</span>
          <div className={styles.driverPin}>DR</div>
          <div className={styles.visualBadge}>{visualLabel}</div>
        </div>
        {routePreview ? (
          <div className={styles.routeCard}>
            <div>
              <span>Pickup</span>
              <strong>{routePreview.pickup}</strong>
            </div>
            <div>
              <span>Dropoff</span>
              <strong>{routePreview.dropoff}</strong>
            </div>
            <dl>
              <div>
                <dt>ETA</dt>
                <dd>{routePreview.eta}</dd>
              </div>
              <div>
                <dt>Distance</dt>
                <dd>{routePreview.distance}</dd>
              </div>
              <div>
                <dt>Fare</dt>
                <dd>{routePreview.fare}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </section>

      <aside className={styles.insightsPanel}>
        {panels.map((panel) => (
          <section className={styles.insightCard} key={panel.title}>
            <h2>{panel.title}</h2>
            <div className={styles.insightRows}>
              {panel.items.map((item) => (
                <div className={styles.insightRow} key={`${panel.title}-${item.label}`}>
                  <span>{item.label}</span>
                  <Badge tone={item.tone ?? "neutral"}>{item.value}</Badge>
                </div>
              ))}
            </div>
          </section>
        ))}
      </aside>
    </section>
  );
}
