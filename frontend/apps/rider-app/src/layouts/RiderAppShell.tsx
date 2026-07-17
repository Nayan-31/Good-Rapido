import { BottomNav, Button } from "@good-rapido/ui";
import type { ReactNode } from "react";

import { bottomNavRoutes, type RiderRoute, type RiderRouteId } from "@/routes";
import styles from "./RiderAppShell.module.css";

export interface RiderAppShellProps {
  activeRoute: RiderRoute;
  onNavigate: (routeId: RiderRouteId) => void;
  onSignOut?: () => void;
  children?: ReactNode;
}

export function RiderAppShell({ activeRoute, onNavigate, onSignOut, children }: RiderAppShellProps) {
  const activeNavId = activeRoute.showInBottomNav ? activeRoute.id : "home";

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <button className={styles.menuButton} type="button" aria-label="Open menu">
            <span />
            <span />
            <span />
          </button>
          <strong>Good Rapido</strong>
        </div>
        <nav className={styles.desktopNav} aria-label="Primary navigation">
          {bottomNavRoutes.map((route) => (
            <button
              key={route.id}
              className={route.id === activeNavId ? styles.activeNavItem : styles.navItem}
              type="button"
              aria-current={route.id === activeNavId ? "page" : undefined}
              onClick={() => onNavigate(route.id)}
            >
              {route.navLabel}
            </button>
          ))}
        </nav>
        <div className={styles.headerActions}>
          {onSignOut ? (
            <Button size="sm" variant="ghost" type="button" onClick={onSignOut}>
              Sign out
            </Button>
          ) : null}
          <span className={styles.avatar} aria-hidden="true">
            GR
          </span>
        </div>
      </header>
      <main className={styles.main} data-route={activeRoute.id} aria-labelledby="rider-route-title">
        <h2 className={styles.visuallyHidden} id="rider-route-title">
          {activeRoute.title}
        </h2>
        {children}
      </main>
      <BottomNav
        className={styles.mobileNav}
        activeId={activeNavId}
        items={bottomNavRoutes.map((route) => ({
          id: route.id,
          label: route.navLabel
        }))}
        onChange={(item) => onNavigate(item.id as RiderRouteId)}
      />
    </div>
  );
}
