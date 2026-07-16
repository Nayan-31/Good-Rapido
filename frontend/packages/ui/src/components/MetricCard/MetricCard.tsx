import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/cn";
import styles from "./MetricCard.module.css";

export type MetricTone = "neutral" | "trust" | "success" | "warning" | "danger" | "navy";

export interface MetricCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  trend?: ReactNode;
  tone?: MetricTone;
}

export function MetricCard({ label, value, meta, trend, tone = "neutral", className, ...props }: MetricCardProps) {
  return (
    <div className={cn(styles.root, styles[tone], className)} {...props}>
      <span className={styles.label}>{label}</span>
      <strong className={styles.value}>{value}</strong>
      {meta ? <span className={styles.meta}>{meta}</span> : null}
      {trend ? <span className={styles.trend}>{trend}</span> : null}
    </div>
  );
}
