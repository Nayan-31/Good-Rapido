export type OpsRouteId =
  | "overview"
  | "rideOps"
  | "pricing"
  | "trustSafety"
  | "fraudDisputes"
  | "communications"
  | "adminUsers"
  | "analytics"
  | "auth";

export interface OpsRoute {
  id: OpsRouteId;
  path: string;
  title: string;
  navLabel: string;
  backendModules: string[];
}

export const opsRoutes = [
  {
    id: "auth",
    path: "/",
    title: "Ops Login",
    navLabel: "Login",
    backendModules: ["private/auth/admins", "private/auth/ops"]
  },
  {
    id: "overview",
    path: "/overview",
    title: "Operations Overview",
    navLabel: "Overview",
    backendModules: ["private/admin", "private/analytics", "private/ride-ops"]
  },
  {
    id: "rideOps",
    path: "/rides",
    title: "Ride Operations",
    navLabel: "Rides",
    backendModules: ["private/ride-ops", "core/ride-lifecycle", "core/matching-engine"]
  },
  {
    id: "pricing",
    path: "/pricing",
    title: "Pricing and Surge",
    navLabel: "Pricing",
    backendModules: ["private/pricing", "private/surge", "core/pricing-engine"]
  },
  {
    id: "trustSafety",
    path: "/trust-safety",
    title: "Trust and Safety",
    navLabel: "Trust",
    backendModules: ["private/trust", "core/trust-engine", "private/driver-documents", "private/vehicle"]
  },
  {
    id: "fraudDisputes",
    path: "/fraud-disputes",
    title: "Fraud and Disputes",
    navLabel: "Fraud",
    backendModules: ["private/fraud", "core/fraud-engine", "private/disputes"]
  },
  {
    id: "communications",
    path: "/communications",
    title: "Communications",
    navLabel: "Comms",
    backendModules: ["private/notifications", "core/notification-engine", "private/support"]
  },
  {
    id: "adminUsers",
    path: "/admin-users",
    title: "Admin Users",
    navLabel: "Users",
    backendModules: ["private/admin", "private/auth"]
  },
  {
    id: "analytics",
    path: "/analytics",
    title: "Analytics",
    navLabel: "Analytics",
    backendModules: ["private/analytics"]
  }
] as const satisfies readonly OpsRoute[];

export const defaultOpsRoute = opsRoutes[0];
export const authedDefaultOpsRoute = opsRoutes.find((route) => route.id === "overview") ?? defaultOpsRoute;
export const navOpsRoutes = opsRoutes.filter((route) => route.id !== "auth");

export const normalizeRoutePath = (path: string) => {
  const normalizedPath = path.trim().replace(/^#/, "") || "/";

  if (normalizedPath === "/") {
    return normalizedPath;
  }

  return `/${normalizedPath.replace(/^\/+/, "").replace(/\/+$/, "")}`;
};

export const findOpsRouteByPath = (path: string) =>
  opsRoutes.find((route) => route.path === normalizeRoutePath(path)) ?? defaultOpsRoute;

export const findOpsRouteById = (routeId: OpsRouteId) =>
  opsRoutes.find((route) => route.id === routeId) ?? defaultOpsRoute;
