import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import styles from "./BottomNav.module.css";

export interface BottomNavItem {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface BottomNavProps {
  items: BottomNavItem[];
  activeId: string;
  onChange?: (item: BottomNavItem) => void;
  className?: string;
  ariaLabel?: string;
}

export function BottomNav({ items, activeId, onChange, className, ariaLabel = "Primary navigation" }: BottomNavProps) {
  return (
    <nav className={cn(styles.root, className)} aria-label={ariaLabel}>
      {items.map((item) => {
        const isActive = item.id === activeId;

        return (
          <button
            key={item.id}
            className={cn(styles.item, isActive && styles.active)}
            type="button"
            aria-current={isActive ? "page" : undefined}
            disabled={item.disabled}
            onClick={() => onChange?.(item)}
          >
            <span className={styles.icon} aria-hidden="true">
              {item.icon}
            </span>
            <span className={styles.label}>{item.label}</span>
            {item.badge ? <span className={styles.badge}>{item.badge}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}
