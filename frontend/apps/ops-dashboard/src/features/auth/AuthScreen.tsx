import { useState, type FormEvent } from "react";

import { toFriendlyApiErrorMessage } from "@good-rapido/api-client";
import { Alert, Badge, Button, Card, TextField } from "@good-rapido/ui";
import type { OpsLoginForm } from "./auth.types";
import styles from "./AuthScreen.module.css";

export interface AuthScreenProps {
  isRestoring: boolean;
  onAuthenticated: () => void;
  onRestoreSession: () => Promise<string>;
  onSignIn: (form: OpsLoginForm) => Promise<string>;
  notice?: string | null;
  onNoticeDismiss?: () => void;
}

const defaultForm: OpsLoginForm = {
  role: "ops",
  identifier: "ops@goodrapido.test",
  password: "Password@123"
};

export function AuthScreen({
  isRestoring,
  onAuthenticated,
  onRestoreSession,
  onSignIn,
  notice,
  onNoticeDismiss
}: AuthScreenProps) {
  const [form, setForm] = useState<OpsLoginForm>(defaultForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    onNoticeDismiss?.();
    setIsSubmitting(true);

    try {
      const nextMessage = await onSignIn(form);
      setMessage(nextMessage);
      onAuthenticated();
    } catch (submitError) {
      setError(toFriendlyApiErrorMessage(submitError, "login"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const restore = async () => {
    setError(null);
    setMessage(null);
    onNoticeDismiss?.();

    try {
      const nextMessage = await onRestoreSession();
      setMessage(nextMessage);
      onAuthenticated();
    } catch (restoreError) {
      setError(toFriendlyApiErrorMessage(restoreError, "restore"));
    }
  };

  return (
    <section className={styles.screen}>
      <Card className={styles.hero} variant="navy" padding="lg">
        <Badge tone="trust">Private operations</Badge>
        <h1>Good Rapido Ops Dashboard</h1>
        <p>
          Central command surface for admins and ops teams to monitor rides, pricing, fraud, trust, disputes,
          notifications, and operational analytics.
        </p>
        <div className={styles.endpointGrid} aria-label="Private auth endpoints">
          <span>POST /api/v1/private/auth/admins/login</span>
          <span>POST /api/v1/private/auth/ops/login</span>
          <span>POST /api/v1/private/auth/:role/refresh</span>
          <span>GET /api/v1/private/auth/:role/me</span>
        </div>
      </Card>

      <Card className={styles.formCard} padding="lg">
        <div className={styles.formHeader}>
          <div>
            <span className={styles.eyebrow}>Protected Access</span>
            <h2>Sign in as admin or ops</h2>
          </div>
          <Badge tone={form.role === "admin" ? "navy" : "trust"}>{form.role}</Badge>
        </div>

        <form className={styles.form} onSubmit={(event) => void submit(event)}>
          <div className={styles.roleToggle} aria-label="Ops role">
            <button
              className={form.role === "ops" ? styles.selectedRole : styles.roleButton}
              type="button"
              onClick={() => {
                setForm((current) => ({ ...current, role: "ops" }));
                onNoticeDismiss?.();
              }}
            >
              Ops
            </button>
            <button
              className={form.role === "admin" ? styles.selectedRole : styles.roleButton}
              type="button"
              onClick={() => {
                setForm((current) => ({ ...current, role: "admin" }));
                onNoticeDismiss?.();
              }}
            >
              Admin
            </button>
          </div>

          <TextField
            label="Phone or Email"
            value={form.identifier}
            onChange={(event) => setForm((current) => ({ ...current, identifier: event.target.value }))}
          />
          <TextField
            label="Password"
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          />

          {error ? (
            <Alert tone="danger" title="Ops session failed">
              {error}
            </Alert>
          ) : null}
          {message || notice ? (
            <Alert tone="trust" title={message ? "Ops session ready" : "Session notice"}>
              {message || notice}
            </Alert>
          ) : null}

          <div className={styles.actions}>
            <Button fullWidth type="submit" isLoading={isSubmitting}>
              Sign In
            </Button>
            <Button fullWidth type="button" variant="secondary" isLoading={isRestoring} onClick={() => void restore()}>
              Restore Session
            </Button>
          </div>
          <p className={styles.helperText}>
            Admin and ops self-registration is disabled in the backend. Run the private auth seed command before first login.
          </p>
        </form>
      </Card>
    </section>
  );
}
