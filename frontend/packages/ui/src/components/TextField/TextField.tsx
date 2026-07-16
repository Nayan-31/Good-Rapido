import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/cn";
import styles from "./TextField.module.css";

export type TextFieldSize = "sm" | "md" | "lg";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  helperText?: string;
  error?: string;
  fieldSize?: TextFieldSize;
  leadingIcon?: ReactNode;
  trailingAction?: ReactNode;
  fullWidth?: boolean;
}

export function TextField({
  label,
  helperText,
  error,
  fieldSize = "md",
  leadingIcon,
  trailingAction,
  fullWidth = true,
  className,
  id,
  ...props
}: TextFieldProps) {
  const generatedId = id ?? props.name;

  return (
    <label className={cn(styles.root, fullWidth && styles.fullWidth, className)} htmlFor={generatedId}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <span className={cn(styles.control, styles[fieldSize], error && styles.hasError)}>
        {leadingIcon ? <span className={styles.leadingIcon}>{leadingIcon}</span> : null}
        <input className={styles.input} id={generatedId} aria-invalid={Boolean(error)} {...props} />
        {trailingAction ? <span className={styles.trailingAction}>{trailingAction}</span> : null}
      </span>
      {error ? <span className={styles.errorText}>{error}</span> : null}
      {!error && helperText ? <span className={styles.helper}>{helperText}</span> : null}
    </label>
  );
}
