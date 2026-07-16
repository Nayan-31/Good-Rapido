export type RiderRouteId = "home" | "estimate" | "confirm" | "history" | "safety" | "profile" | "identity";

export interface RiderRoute {
  id: RiderRouteId;
  path: string;
  title: string;
  navLabel: string;
  showInBottomNav: boolean;
}

export const riderRoutes = [
  {
    id: "home",
    path: "/",
    title: "Good Rapido",
    navLabel: "Home",
    showInBottomNav: true
  },
  {
    id: "estimate",
    path: "/estimate",
    title: "Fare Estimate",
    navLabel: "Estimate",
    showInBottomNav: false
  },
  {
    id: "confirm",
    path: "/confirm",
    title: "Confirm Ride",
    navLabel: "Confirm",
    showInBottomNav: false
  },
  {
    id: "history",
    path: "/history",
    title: "History",
    navLabel: "History",
    showInBottomNav: true
  },
  {
    id: "safety",
    path: "/safety",
    title: "Safety & Help",
    navLabel: "Safety",
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
    id: "identity",
    path: "/identity",
    title: "Identity Verification",
    navLabel: "Identity",
    showInBottomNav: false
  }
] as const satisfies readonly RiderRoute[];

export const defaultRiderRoute = riderRoutes[0];

export const bottomNavRoutes = riderRoutes.filter((route) => route.showInBottomNav);

export const findRiderRouteByPath = (path: string) =>
  riderRoutes.find((route) => route.path === normalizeRoutePath(path)) ?? defaultRiderRoute;

export const findRiderRouteById = (routeId: RiderRouteId) =>
  riderRoutes.find((route) => route.id === routeId) ?? defaultRiderRoute;

export const normalizeRoutePath = (path: string) => {
  const normalizedPath = path.trim().replace(/^#/, "") || "/";

  if (normalizedPath === "/") {
    return normalizedPath;
  }

  return `/${normalizedPath.replace(/^\/+/, "").replace(/\/+$/, "")}`;
};
