export type DriverRouteId =
  | "availability"
  | "requests"
  | "activeRide"
  | "earnings"
  | "trust"
  | "notifications"
  | "profile"
  | "onboarding"
  | "auth"
  | "support";

export interface DriverRoute {
  id: DriverRouteId;
  path: string;
  title: string;
  navLabel: string;
  showInBottomNav: boolean;
}

export const driverRoutes = [
  {
    id: "auth",
    path: "/",
    title: "Driver Login",
    navLabel: "Login",
    showInBottomNav: false
  },
  {
    id: "onboarding",
    path: "/onboarding",
    title: "Onboarding",
    navLabel: "Setup",
    showInBottomNav: false
  },
  {
    id: "availability",
    path: "/availability",
    title: "Driver Home",
    navLabel: "Home",
    showInBottomNav: true
  },
  {
    id: "requests",
    path: "/requests",
    title: "Ride Requests",
    navLabel: "Requests",
    showInBottomNav: true
  },
  {
    id: "activeRide",
    path: "/active-ride",
    title: "Active Ride",
    navLabel: "Ride",
    showInBottomNav: true
  },
  {
    id: "earnings",
    path: "/earnings",
    title: "Earnings",
    navLabel: "Earnings",
    showInBottomNav: true
  },
  {
    id: "trust",
    path: "/trust",
    title: "Trust Score",
    navLabel: "Trust",
    showInBottomNav: false
  },
  {
    id: "notifications",
    path: "/notifications",
    title: "Notifications",
    navLabel: "Alerts",
    showInBottomNav: false
  },
  {
    id: "profile",
    path: "/profile",
    title: "Profile",
    navLabel: "Profile",
    showInBottomNav: true
  },
  {
    id: "support",
    path: "/support",
    title: "Support",
    navLabel: "Support",
    showInBottomNav: false
  }
] as const satisfies readonly DriverRoute[];

export const defaultDriverRoute = driverRoutes[0];

export const bottomNavRoutes = driverRoutes.filter((route) => route.showInBottomNav);

export const findDriverRouteByPath = (path: string) =>
  driverRoutes.find((route) => route.path === normalizeRoutePath(path)) ?? defaultDriverRoute;

export const findDriverRouteById = (routeId: DriverRouteId) =>
  driverRoutes.find((route) => route.id === routeId) ?? defaultDriverRoute;

export const normalizeRoutePath = (path: string) => {
  const normalizedPath = path.trim().replace(/^#/, "") || "/";

  if (normalizedPath === "/") {
    return normalizedPath;
  }

  return `/${normalizedPath.replace(/^\/+/, "").replace(/\/+$/, "")}`;
};
