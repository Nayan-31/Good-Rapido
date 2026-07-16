import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/cn";
import styles from "./AppHeader.module.css";

export interface AppHeaderProps extends HTMLAttributes<HTMLElement> {
  title: string;
  eyebrow?: string;
  leadingAction?: ReactNode;
  trailingAction?: ReactNode;
  sticky?: boolean;
}

export function AppHeader({
  title,
  eyebrow,
  leadingAction,
  trailingAction,
  sticky = false,
  className,
  ...props
}: AppHeaderProps) {
  return (
    <header className={cn(styles.root, sticky && styles.sticky, className)} {...props}>
      <div className={styles.action}>{leadingAction}</div>
      <div className={styles.copy}>
        {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
        <h1 className={styles.title}>{title}</h1>
      </div>
      <div className={styles.action}>{trailingAction}</div>
    </header>
  );
}
