import type { HTMLAttributes } from "react";

import { cn } from "../../lib/cn";
import styles from "./Card.module.css";

export type CardVariant = "default" | "soft" | "navy" | "mint" | "danger";
export type CardPadding = "sm" | "md" | "lg";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
}

export function Card({
  variant = "default",
  padding = "md",
  interactive = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        styles.root,
        styles[variant],
        styles[`padding${padding.toUpperCase()}`],
        interactive && styles.interactive,
        className
      )}
      {...props}
    />
  );
}
