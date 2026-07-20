import { Badge, Button, Card, MetricCard, ProgressBar } from "@good-rapido/ui";

import styles from "./ModuleScreen.module.css";

export interface OpsMetric {
  label: string;
  value: string;
  meta: string;
  tone?: "neutral" | "trust" | "success" | "warning" | "danger" | "navy";
}

export interface OpsQueueItem {
  title: string;
  meta: string;
  status: string;
  tone?: "neutral" | "trust" | "success" | "warning" | "danger" | "navy";
}

export interface OpsWorkflowItem {
  label: string;
  backend: string;
  status: string;
  progress: number;
}

export interface ModuleScreenProps {
  eyebrow: string;
  title: string;
  description: string;
  backendModules: string[];
  metrics: OpsMetric[];
  queue: OpsQueueItem[];
  workflows: OpsWorkflowItem[];
  primaryAction: string;
  secondaryAction: string;
}

export function ModuleScreen({
  eyebrow,
  title,
  description,
  backendModules,
  metrics,
  queue,
  workflows,
  primaryAction,
  secondaryAction
}: ModuleScreenProps) {
  return (
    <section className={styles.screen}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className={styles.actions}>
          <Button type="button">{primaryAction}</Button>
          <Button type="button" variant="secondary">{secondaryAction}</Button>
        </div>
      </section>

      <section className={styles.metrics} aria-label={`${title} metrics`}>
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            meta={metric.meta}
            tone={metric.tone ?? "neutral"}
          />
        ))}
      </section>

      <section className={styles.grid}>
        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Backend Modules</span>
              <h2>Connected contracts</h2>
            </div>
            <Badge tone="trust">Ready to wire</Badge>
          </div>
          <div className={styles.moduleList}>
            {backendModules.map((moduleName) => (
              <span key={moduleName}>{moduleName}</span>
            ))}
          </div>
        </Card>

        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Queue</span>
              <h2>Needs ops attention</h2>
            </div>
            <Badge tone="warning">{queue.length} open</Badge>
          </div>
          <div className={styles.queueList}>
            {queue.map((item) => (
              <div className={styles.queueItem} key={item.title}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.meta}</span>
                </div>
                <Badge tone={item.tone ?? "neutral"}>{item.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card padding="lg" className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>Workflow Map</span>
            <h2>What this screen will control</h2>
          </div>
          <Badge tone="navy">Skeleton</Badge>
        </div>
        <div className={styles.workflowGrid}>
          {workflows.map((workflow) => (
            <div className={styles.workflowItem} key={workflow.label}>
              <div>
                <strong>{workflow.label}</strong>
                <span>{workflow.backend}</span>
              </div>
              <ProgressBar value={workflow.progress} label={workflow.status} showValue tone="trust" />
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
