import { useState } from "react";
import type { FormEvent } from "react";

import { toFriendlyApiErrorMessage } from "@good-rapido/api-client";
import { Alert, Badge, Button, TextField } from "@good-rapido/ui";
import type { DriverLoginForm, DriverRegisterForm } from "./auth.types";
import styles from "./AuthScreen.module.css";

type AuthMode = "login" | "register";

export interface AuthScreenProps {
  onSignIn: (form: DriverLoginForm) => Promise<string>;
  onRegister: (form: DriverRegisterForm) => Promise<string>;
  onRestoreSession: () => Promise<string>;
  onAuthenticated: (mode: AuthMode) => void;
  isRestoring: boolean;
  notice?: string | null;
  onNoticeDismiss?: () => void;
}

const defaultLoginForm: DriverLoginForm = {
  identifier: "arjun.singh.driver@goodrapido.test",
  password: "Password@123"
};

const defaultRegisterForm: DriverRegisterForm = {
  fullName: "Amit Das",
  email: "amit.driver@goodrapido.test",
  phone: "+919111111111",
  employeeCode: "DRV-001",
  department: "driver_network",
  serviceZone: "kolkata",
  password: "password123"
};

export function AuthScreen({
  onSignIn,
  onRegister,
  onRestoreSession,
  onAuthenticated,
  isRestoring,
  notice,
  onNoticeDismiss
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginForm, setLoginForm] = useState(defaultLoginForm);
  const [registerForm, setRegisterForm] = useState(defaultRegisterForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    onNoticeDismiss?.();
    setIsSubmitting(true);

    try {
      const nextMessage = mode === "login" ? await onSignIn(loginForm) : await onRegister(registerForm);
      setMessage(nextMessage);
      onAuthenticated(mode);
    } catch (submitError) {
      setError(toFriendlyApiErrorMessage(submitError, mode));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestore = async () => {
    setError(null);
    setMessage(null);
    onNoticeDismiss?.();

    try {
      const nextMessage = await onRestoreSession();
      setMessage(nextMessage);
      onAuthenticated("login");
    } catch (restoreError) {
      setError(toFriendlyApiErrorMessage(restoreError, "restore"));
    }
  };

  return (
    <section className={styles.screen}>
      <aside className={styles.hero}>
        <Badge tone="navy">Step 01</Badge>
        <p className={styles.eyebrow}>Driver access</p>
        <h1>Sign in to start your shift</h1>
        <p className={styles.copy}>Private driver APIs protect availability, ride execution, earnings, and trust data.</p>

        <div className={styles.statusGrid}>
          <div>
            <span>Auth scope</span>
            <strong>Private</strong>
          </div>
          <div>
            <span>Role</span>
            <strong>Driver</strong>
          </div>
          <div>
            <span>Session</span>
            <strong>{isRestoring ? "Restoring" : "Ready"}</strong>
          </div>
        </div>
      </aside>

      <section className={styles.formPanel}>
        <div className={styles.tabs} aria-label="Driver authentication mode">
          <button
            className={mode === "login" ? styles.activeTab : styles.tab}
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
              setMessage(null);
              onNoticeDismiss?.();
            }}
          >
            Login
          </button>
          <button
            className={mode === "register" ? styles.activeTab : styles.tab}
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
              setMessage(null);
              onNoticeDismiss?.();
            }}
          >
            Register
          </button>
        </div>

        <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
          {mode === "login" ? (
            <>
              <TextField
                label="Phone, email, or employee code"
                value={loginForm.identifier}
                onChange={(event) => setLoginForm((current) => ({ ...current, identifier: event.target.value }))}
              />
              <TextField
                label="Password"
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
              />
            </>
          ) : (
            <>
              <TextField
                label="Full name"
                value={registerForm.fullName}
                onChange={(event) => setRegisterForm((current) => ({ ...current, fullName: event.target.value }))}
              />
              <div className={styles.grid}>
                <TextField
                  label="Phone"
                  value={registerForm.phone}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, phone: event.target.value }))}
                />
                <TextField
                  label="Email"
                  type="email"
                  value={registerForm.email}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div className={styles.grid}>
                <TextField
                  label="Employee code"
                  value={registerForm.employeeCode}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, employeeCode: event.target.value }))
                  }
                />
                <TextField
                  label="Service zone"
                  value={registerForm.serviceZone}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, serviceZone: event.target.value }))}
                />
              </div>
              <TextField
                label="Department"
                value={registerForm.department}
                onChange={(event) => setRegisterForm((current) => ({ ...current, department: event.target.value }))}
              />
              <TextField
                label="Password"
                type="password"
                value={registerForm.password}
                onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
              />
            </>
          )}

          {error ? (
            <Alert tone="danger" title="Authentication failed">
              {error}
            </Alert>
          ) : null}

          {message || notice ? (
            <Alert tone="trust" title={message ? "Driver session" : "Session notice"}>
              {message || notice}
            </Alert>
          ) : null}

          <div className={styles.actions}>
            <Button fullWidth isLoading={isSubmitting} type="submit">
              {mode === "login" ? "Login as driver" : "Create driver account"}
            </Button>
            <Button fullWidth isLoading={isRestoring} type="button" variant="secondary" onClick={() => void handleRestore()}>
              Restore session
            </Button>
          </div>
        </form>
      </section>

      <aside className={styles.insights}>
        <section>
          <h2>Token storage</h2>
          <div className={styles.row}>
            <span>Access token</span>
            <Badge tone="trust">session</Badge>
          </div>
          <div className={styles.row}>
            <span>Refresh token</span>
            <Badge tone="trust">session</Badge>
          </div>
          <div className={styles.row}>
            <span>Profile cache</span>
            <Badge tone="info">enabled</Badge>
          </div>
        </section>
        <section>
          <h2>Backend routes</h2>
          <div className={styles.row}>
            <span>Login</span>
            <Badge tone="success">private/auth</Badge>
          </div>
          <div className={styles.row}>
            <span>Register</span>
            <Badge tone="success">drivers</Badge>
          </div>
          <div className={styles.row}>
            <span>Restore</span>
            <Badge tone="success">refresh + me</Badge>
          </div>
        </section>
      </aside>
    </section>
  );
}
