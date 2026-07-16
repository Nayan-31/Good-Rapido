import { AppHeader, BottomNav } from "@good-rapido/ui";
import type { ReactNode } from "react";

import { bottomNavRoutes, type RiderRoute, type RiderRouteId } from "@/routes";
import styles from "./RiderAppShell.module.css";

export interface RiderAppShellProps {
  activeRoute: RiderRoute;
  onNavigate: (routeId: RiderRouteId) => void;
  children?: ReactNode;
}

export function RiderAppShell({ activeRoute, onNavigate, children }: RiderAppShellProps) {
  return (
    <div className={styles.shell}>
      <AppHeader title={activeRoute.title} sticky />
      <main className={styles.main} aria-labelledby="rider-route-title">
        <h2 className={styles.visuallyHidden} id="rider-route-title">
          {activeRoute.title}
        </h2>
        {children}
      </main>
      <BottomNav
        activeId={activeRoute.showInBottomNav ? activeRoute.id : "home"}
        items={bottomNavRoutes.map((route) => ({
          id: route.id,
          label: route.navLabel
        }))}
        onChange={(item) => onNavigate(item.id as RiderRouteId)}
      />
    </div>
  );
}
