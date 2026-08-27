import { useState, type ReactNode } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "@good-rapido/ui";

import styles from "./OpsFeedback.module.css";

type FeedbackTone = "success" | "danger" | "info" | "warning" | "neutral";

interface StatusBannerProps {
  tone?: FeedbackTone;
  title: string;
  children?: ReactNode;
}

export function StatusBanner({ tone = "info", title, children }: StatusBannerProps) {
  return (
    <div className={`${styles.banner} ${styles[tone]}`} role={tone === "danger" ? "alert" : "status"}>
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  isLoading?: boolean;
}

export function EmptyState({ title, description, actionLabel, onAction, isLoading = false }: EmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {actionLabel && onAction ? (
        <Button type="button" size="sm" variant="secondary" onClick={onAction} isLoading={isLoading}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

interface LoadingRowsProps {
  rows?: number;
  columns?: number;
}

export function LoadingRows({ rows = 3, columns = 3 }: LoadingRowsProps) {
  return (
    <div className={styles.loadingRows} aria-label="Loading content">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div
          className={styles.loadingRow}
          key={`loading-row-${rowIndex}`}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }, (_, columnIndex) => (
            <span className={styles.loadingCell} key={`loading-cell-${rowIndex}-${columnIndex}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

interface ConfirmActionProps {
  label: string;
  confirmLabel?: string;
  onConfirm: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function ConfirmAction({
  label,
  confirmLabel = "Confirm",
  onConfirm,
  disabled = false,
  isLoading = false,
  variant = "secondary",
  size = "sm"
}: ConfirmActionProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleClick = () => {
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }

    setIsConfirming(false);
    onConfirm();
  };

  return (
    <div className={styles.confirmAction}>
      <Button type="button" size={size} variant={isConfirming ? "danger" : variant} disabled={disabled} isLoading={isLoading} onClick={handleClick}>
        {isConfirming ? confirmLabel : label}
      </Button>
      {isConfirming ? (
        <Button type="button" size={size} variant="ghost" onClick={() => setIsConfirming(false)}>
          Cancel
        </Button>
      ) : null}
    </div>
  );
}
