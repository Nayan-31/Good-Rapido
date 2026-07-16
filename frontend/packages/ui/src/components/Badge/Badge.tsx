import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/cn";
import styles from "./Badge.module.css";

export type BadgeTone = "neutral" | "trust" | "success" | "warning" | "danger" | "info" | "navy";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: "sm" | "md";
  icon?: ReactNode;
}

export function Badge({ tone = "neutral", size = "md", icon, className, children, ...props }: BadgeProps) {
  return (
    <span className={cn(styles.root, styles[tone], styles[size], className)} {...props}>
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      {children}
    </span>
  );
}
