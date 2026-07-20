import { ModuleScreen } from "@/components";
import { findOpsRouteById } from "@/routes";

const route = findOpsRouteById("adminUsers");

export function AdminUsersScreen() {
  return (
    <ModuleScreen
      eyebrow="Admin users"
      title="Manage internal admin and ops users, account status, and permissions"
      description="This admin-only screen maps to private admin APIs. It will let admins create internal users, update role permissions, block or suspend accounts, and audit access readiness."
      backendModules={route.backendModules}
      primaryAction="Create User"
      secondaryAction="Review Permissions"
      metrics={[
        { label: "Admin Users", value: "8", meta: "full access", tone: "navy" },
        { label: "Ops Users", value: "22", meta: "limited access", tone: "trust" },
        { label: "Pending Setup", value: "3", meta: "needs activation", tone: "warning" },
        { label: "Blocked", value: "1", meta: "security hold", tone: "danger" }
      ]}
      queue={[
        { title: "New ops account request", meta: "Kolkata shift lead needs ride ops access", status: "create", tone: "trust" },
        { title: "Pricing permission review", meta: "User has stale pricing write access", status: "audit", tone: "warning" },
        { title: "Suspended admin", meta: "Account blocked after failed login pattern", status: "blocked", tone: "danger" }
      ]}
      workflows={[
        { label: "User directory", backend: "GET /api/v1/private/admin/users", status: "table + filters", progress: 35 },
        { label: "Permission editor", backend: "PATCH /api/v1/private/admin/users/:id/permissions", status: "role matrix", progress: 25 },
        { label: "Status controls", backend: "PATCH /api/v1/private/admin/users/:id/status", status: "security action", progress: 25 }
      ]}
    />
  );
}
