import { BottomNav, Button } from "@good-rapido/ui";
import type { ReactNode } from "react";

import { bottomNavRoutes, driverRoutes, type DriverRoute, type DriverRouteId } from "@/routes";
import styles from "./DriverAppShell.module.css";

export interface DriverAppShellProps {
  activeRoute: DriverRoute;
  isAuthenticated?: boolean;
  userName?: string | null;
  onNavigate: (routeId: DriverRouteId) => void;
  onSignOut?: () => void;
  children?: ReactNode;
}

export function DriverAppShell({
  activeRoute,
  isAuthenticated = false,
  userName,
  onNavigate,
  onSignOut,
  children
}: DriverAppShellProps) {
  const activeNavId = activeRoute.showInBottomNav ? activeRoute.id : "availability";
  const activeStep = driverRoutes.findIndex((route) => route.id === activeRoute.id) + 1;
  const driverInitials = resolveInitials(userName);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <button className={styles.menuButton} type="button" aria-label="Open menu">
            <span />
            <span />
            <span />
          </button>
          <strong>Good Rapido Driver</strong>
        </div>
        <nav className={styles.desktopNav} aria-label="Primary navigation">
          {driverRoutes.map((route, index) => (
            <button
              key={route.id}
              className={route.id === activeRoute.id ? styles.activeNavItem : styles.navItem}
              type="button"
              aria-current={route.id === activeRoute.id ? "page" : undefined}
              onClick={() => onNavigate(route.id)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {route.navLabel}
            </button>
          ))}
        </nav>
        <div className={styles.headerActions}>
          {isAuthenticated ? (
            <>
              <Button size="sm" variant="mint" type="button" onClick={() => onNavigate("availability")}>
                Go online
              </Button>
              {onSignOut ? (
                <Button size="sm" variant="ghost" type="button" onClick={onSignOut}>
                  Logout
                </Button>
              ) : null}
            </>
          ) : (
            <Button size="sm" variant="secondary" type="button" onClick={() => onNavigate("auth")}>
              Login
            </Button>
          )}
          <span className={styles.avatar} aria-hidden="true">
            {driverInitials}
          </span>
        </div>
      </header>
      <div className={styles.flowBar} aria-label="Driver flow progress">
        <span>Step {activeStep} of {driverRoutes.length}</span>
        <strong>{activeRoute.title}</strong>
      </div>
      <main className={styles.main} data-route={activeRoute.id} aria-labelledby="driver-route-title">
        <h2 className={styles.visuallyHidden} id="driver-route-title">
          {activeRoute.title}
        </h2>
        {children}
      </main>
      {activeRoute.showInBottomNav ? (
        <BottomNav
          className={styles.mobileNav}
          activeId={activeNavId}
          items={bottomNavRoutes.map((route) => ({
            id: route.id,
            label: route.navLabel
          }))}
          onChange={(item) => onNavigate(item.id as DriverRouteId)}
        />
      ) : null}
    </div>
  );
}

const resolveInitials = (name?: string | null) => {
  if (!name) {
    return "DR";
  }

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "DR";
};
