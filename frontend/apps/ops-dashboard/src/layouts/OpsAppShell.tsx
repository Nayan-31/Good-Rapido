import { Button } from "@good-rapido/ui";
import type { ReactNode } from "react";

import { navOpsRoutes, type OpsRoute, type OpsRouteId } from "@/routes";
import type { OpsAuthSession } from "@/features/auth";
import styles from "./OpsAppShell.module.css";

export interface OpsAppShellProps {
  activeRoute: OpsRoute;
  isAuthenticated: boolean;
  session?: OpsAuthSession | null;
  onNavigate: (routeId: OpsRouteId) => void;
  onSignOut?: () => void;
  children?: ReactNode;
}

export function OpsAppShell({
  activeRoute,
  isAuthenticated,
  session,
  onNavigate,
  onSignOut,
  children
}: OpsAppShellProps) {
  const userLabel = session?.user?.fullName ?? (isAuthenticated ? "Ops User" : "Guest");
  const roleLabel = session?.role ?? "private";

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.logo}>GR</span>
          <div>
            <strong>Good Rapido</strong>
            <small>Ops Dashboard</small>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Ops navigation">
          {navOpsRoutes.map((route) => (
            <button
              key={route.id}
              className={route.id === activeRoute.id ? styles.activeNavItem : styles.navItem}
              type="button"
              aria-current={route.id === activeRoute.id ? "page" : undefined}
              onClick={() => onNavigate(route.id)}
            >
              <span>{route.navLabel}</span>
              <small>{route.backendModules[0]}</small>
            </button>
          ))}
        </nav>
      </aside>

      <div className={styles.content}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>{roleLabel} access</span>
            <h1>{activeRoute.title}</h1>
          </div>
          <div className={styles.headerActions}>
            <span className={styles.userPill}>{userLabel}</span>
            {isAuthenticated && onSignOut ? (
              <Button type="button" size="sm" variant="secondary" onClick={onSignOut}>
                Logout
              </Button>
            ) : null}
          </div>
        </header>

        <main className={styles.main} aria-labelledby="ops-route-title">
          <h2 className={styles.visuallyHidden} id="ops-route-title">
            {activeRoute.title}
          </h2>
          {children}
        </main>
      </div>
    </div>
  );
}
