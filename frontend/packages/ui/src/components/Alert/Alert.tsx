import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/cn";
import styles from "./Alert.module.css";

export type AlertTone = "neutral" | "trust" | "success" | "warning" | "danger" | "info";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  tone?: AlertTone;
  icon?: ReactNode;
  action?: ReactNode;
}

export function Alert({ title, tone = "neutral", icon, action, className, children, ...props }: AlertProps) {
  return (
    <div className={cn(styles.root, styles[tone], className)} role={tone === "danger" ? "alert" : "status"} {...props}>
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      <div className={styles.content}>
        {title ? <strong className={styles.title}>{title}</strong> : null}
        {children ? <div className={styles.body}>{children}</div> : null}
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
