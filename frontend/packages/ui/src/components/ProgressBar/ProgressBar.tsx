import type { HTMLAttributes } from "react";

import { cn } from "../../lib/cn";
import styles from "./ProgressBar.module.css";

export type ProgressTone = "neutral" | "trust" | "success" | "warning" | "danger" | "info";

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  tone?: ProgressTone;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  tone = "trust",
  className,
  ...props
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const clampedValue = Math.min(Math.max(value, 0), max);

  return (
    <div className={cn(styles.root, className)} {...props}>
      {(label || showValue) && (
        <div className={styles.header}>
          {label ? <span>{label}</span> : <span />}
          {showValue ? <strong>{Math.round(percentage)}%</strong> : null}
        </div>
      )}
      <div className={styles.track} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={clampedValue}>
        <span className={cn(styles.fill, styles[tone])} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
