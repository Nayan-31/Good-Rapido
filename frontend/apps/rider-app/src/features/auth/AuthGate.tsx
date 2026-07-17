import { useState } from "react";
import type { FormEvent } from "react";

import { Alert, AppHeader, Button, Card, TextField } from "@good-rapido/ui";
import type { LoginForm, RegisterForm } from "./auth.types";
import styles from "./AuthGate.module.css";

type AuthMode = "login" | "register";

export interface AuthGateProps {
  onSignIn: (form: LoginForm) => Promise<string>;
  onRegister: (form: RegisterForm) => Promise<string>;
}

const defaultLoginForm: LoginForm = {
  identifier: "+919999000001",
  password: "Password@123"
};

const defaultRegisterForm: RegisterForm = {
  fullName: "",
  email: "",
  phone: "",
  password: ""
};

export function AuthGate({ onSignIn, onRegister }: AuthGateProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginForm, setLoginForm] = useState<LoginForm>(defaultLoginForm);
  const [registerForm, setRegisterForm] = useState<RegisterForm>(defaultRegisterForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const nextMessage = mode === "login" ? await onSignIn(loginForm) : await onRegister(registerForm);
      setMessage(nextMessage);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.root}>
      <AppHeader title="Good Rapido" sticky />
      <main className={styles.main}>
        <Card className={styles.hero} variant="navy" padding="lg">
          <div>
            <p className={styles.eyebrow}>Rider Access</p>
            <h2 className={styles.title}>Sign in to unlock booking, fare, and safety flows</h2>
          </div>
          <p className={styles.copy}>
            Backend APIs are protected, so the rider app needs a valid access token before live actions can run.
          </p>
        </Card>

        <Card padding="lg">
          <div className={styles.tabs} aria-label="Authentication mode">
            <button
              className={mode === "login" ? styles.selectedTab : styles.tab}
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setMessage(null);
              }}
            >
              Sign In
            </button>
            <button
              className={mode === "register" ? styles.selectedTab : styles.tab}
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
                setMessage(null);
              }}
            >
              Register
            </button>
          </div>

          <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
            {mode === "login" ? (
              <>
                <TextField
                  label="Phone or Email"
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
                  label="Full Name"
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
                <TextField
                  label="Password"
                  type="password"
                  value={registerForm.password}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                />
              </>
            )}

            {error ? (
              <Alert tone="danger" title="Session Failed">
                {error}
              </Alert>
            ) : null}

            {message ? (
              <Alert tone="trust" title="Session Ready">
                {message}
              </Alert>
            ) : null}

            <div className={styles.actions}>
              <Button fullWidth isLoading={isSubmitting} type="submit">
                {mode === "login" ? "Sign In" : "Create Account"}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
