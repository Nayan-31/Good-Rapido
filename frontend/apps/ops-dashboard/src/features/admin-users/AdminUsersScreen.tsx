import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, MetricCard, ProgressBar } from "@good-rapido/ui";

import { ConfirmAction, EmptyState, LoadingRows, StatusBanner } from "@/components";
import { findOpsRouteById } from "@/routes";
import { adminUsersService } from "./adminUsers.service";
import type {
  AdminCreateFormState,
  AdminDashboard,
  AdminDashboardSummary,
  AdminOptions,
  AdminUserDetail,
  AdminUserFilters,
  AdminUserListItem
} from "./adminUsers.types";
import styles from "./AdminUsersScreen.module.css";

const route = findOpsRouteById("adminUsers");

const emptySummary: AdminDashboardSummary = {
  totalUsers: 0,
  activeCount: 0,
  pendingCount: 0,
  blockedCount: 0,
  suspendedCount: 0,
  driverCount: 0,
  adminCount: 0,
  opsCount: 0
};

const initialFilters: AdminUserFilters = {
  role: "",
  accountStatus: "",
  q: ""
};

const initialForm: AdminCreateFormState = {
  role: "ops",
  fullName: "Kolkata Ops Lead",
  email: "kolkata.ops@goodrapido.test",
  phone: "+918105463763",
  employeeCode: "OPS-KOL-01",
  department: "ride_operations",
  serviceZone: "kolkata",
  accountStatus: "active",
  password: "Password@123"
};

const fallbackPermissions = [
  "ops:rides:read",
  "ops:rides:write",
  "ops:notifications:write",
  "analytics:read"
];

export function AdminUsersScreen() {
  const [options, setOptions] = useState<AdminOptions | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [summary, setSummary] = useState<AdminDashboardSummary>(emptySummary);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<AdminUserDetail | null>(null);
  const [filters, setFilters] = useState<AdminUserFilters>(initialFilters);
  const [form, setForm] = useState<AdminCreateFormState>(initialForm);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(fallbackPermissions);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAdminUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await adminUsersService.load(filters);
      setOptions(data.options ?? null);
      setDashboard(data.dashboard ?? null);
      setSummary(data.users?.summary ?? data.dashboard?.summary ?? emptySummary);
      setUsers(data.users?.users ?? data.dashboard?.recentUsers ?? []);
    } catch (caughtError) {
      setError(resolveErrorMessage(caughtError));
      setOptions(null);
      setDashboard(null);
      setSummary(emptySummary);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadAdminUsers();
  }, [loadAdminUsers]);

  useEffect(() => {
    if (options && !selectedPermissions.length) {
      setSelectedPermissions(options.defaultRolePermissions[form.role] ?? fallbackPermissions);
    }
  }, [form.role, options, selectedPermissions.length]);

  const permissionGroups = useMemo(() => {
    const permissionList = options?.permissions?.length ? options.permissions : fallbackPermissions;

    return permissionList.reduce<Record<string, string[]>>((groups, permission) => {
      const group = permission.split(":")[0] || "general";

      return {
        ...groups,
        [group]: [...(groups[group] ?? []), permission]
      };
    }, {});
  }, [options?.permissions]);

  const coverage = options?.permissions?.length
    ? Math.round((selectedPermissions.length / options.permissions.length) * 100)
    : 0;
  const hasFilters = Boolean(filters.role || filters.accountStatus || filters.q.trim());
  const canSubmitUser = Boolean(form.role && form.fullName.trim() && form.email.trim() && form.password.trim() && selectedPermissions.length);

  const runAction = async (actionName: string, action: () => Promise<unknown>, successMessage: string) => {
    setPendingAction(actionName);
    setMessage(null);
    setError(null);

    try {
      await action();
      setMessage(successMessage);
      await loadAdminUsers();
    } catch (caughtError) {
      setError(resolveErrorMessage(caughtError));
    } finally {
      setPendingAction(null);
    }
  };

  const openUser = async (user: AdminUserListItem) => {
    await runAction(`open:${user.id}`, async () => {
      const detail = await adminUsersService.getUser(user.id);
      setSelectedDetail(detail ?? null);
      setSelectedPermissions(detail?.user.permissions ?? []);
      setForm({
        role: detail?.user.role ?? user.role ?? "ops",
        fullName: detail?.user.fullName ?? user.fullName ?? "",
        email: detail?.user.email ?? user.email ?? "",
        phone: detail?.user.phone ?? user.phone ?? "",
        employeeCode: detail?.user.employeeCode ?? user.employeeCode ?? "",
        department: detail?.user.department ?? user.department ?? "",
        serviceZone: detail?.user.serviceZone ?? user.serviceZone ?? "",
        accountStatus: detail?.user.accountStatus ?? user.accountStatus ?? "active",
        password: initialForm.password
      });
    }, `Opened ${user.fullName || user.email || user.id}`);
  };

  const updateForm = (field: keyof AdminCreateFormState, value: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));

    if (field === "role" && options?.defaultRolePermissions[value]) {
      setSelectedPermissions(options.defaultRolePermissions[value]);
    }
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions((currentPermissions) => (
      currentPermissions.includes(permission)
        ? currentPermissions.filter((item) => item !== permission)
        : [...currentPermissions, permission]
    ));
  };

  return (
    <section className={styles.screen}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Admin Users</span>
          <h1>Manage internal users, account status, and permission boundaries</h1>
          <p>Connected with {route.backendModules.join(", ")} for admin directory, user creation, profile updates, status controls, and permission matrix operations.</p>
        </div>
        <div className={styles.heroActions}>
          <Button type="button" onClick={() => void loadAdminUsers()} isLoading={isLoading}>Refresh Users</Button>
          <Badge tone={error ? "danger" : "trust"}>{error ? "Needs admin auth" : "Backend wired"}</Badge>
        </div>
      </section>

      <section className={styles.metrics}>
        <MetricCard label="Total Users" value={String(summary.totalUsers)} meta={`${summary.activeCount} active`} tone="navy" />
        <MetricCard label="Admins" value={String(summary.adminCount)} meta="full access candidates" tone="danger" />
        <MetricCard label="Ops Users" value={String(summary.opsCount)} meta="operations team" tone="trust" />
        <MetricCard label="Blocked/Suspended" value={String(summary.blockedCount + summary.suspendedCount)} meta="security hold" tone="warning" />
      </section>

      {error ? <StatusBanner tone="danger" title="Admin users request failed">{error}</StatusBanner> : null}
      {message ? <StatusBanner tone="success" title="Admin action completed">{message}</StatusBanner> : null}

      <Card padding="lg" className={styles.filterPanel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>User Directory</span>
            <h2>Filters and internal accounts</h2>
          </div>
          <div className={styles.panelActions}>
            <Badge tone="navy">{users.length} visible</Badge>
            <Button type="button" size="sm" variant="secondary" disabled={!hasFilters} onClick={() => setFilters(initialFilters)}>
              Clear Filters
            </Button>
          </div>
        </div>
        <div className={styles.filters}>
          <label className={styles.field}>
            <span>Role</span>
            <select value={filters.role} onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}>
              <option value="">All roles</option>
              {(options?.roles ?? ["admin", "ops", "driver"]).map((role) => <option value={role} key={role}>{formatLabel(role)}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Status</span>
            <select value={filters.accountStatus} onChange={(event) => setFilters((current) => ({ ...current, accountStatus: event.target.value }))}>
              <option value="">All statuses</option>
              {(options?.statuses ?? ["active", "pending", "blocked", "suspended"]).map((status) => <option value={status} key={status}>{formatLabel(status)}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Search</span>
            <input value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Name, email, phone" />
          </label>
        </div>

        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>User</span>
            <span>Role</span>
            <span>Status</span>
            <span>Permissions</span>
          </div>
          {isLoading ? <LoadingRows rows={4} columns={4} /> : null}
          {!isLoading ? users.map((user) => (
            <button type="button" className={styles.tableRow} key={user.id} onClick={() => void openUser(user)}>
              <span>
                <strong>{user.fullName || user.email || user.id}</strong>
                <small>{user.email || user.phone || "No contact"}</small>
              </span>
              <Badge tone={user.role === "admin" ? "danger" : "trust"}>{formatLabel(user.role)}</Badge>
              <Badge tone={toneForStatus(user.accountStatus)}>{formatLabel(user.accountStatus)}</Badge>
              <strong>{user.permissionCount}</strong>
            </button>
          )) : null}
          {!isLoading && !users.length ? (
            <EmptyState
              title={hasFilters ? "No users match these filters" : "No admin users found"}
              description={hasFilters ? "Clear filters or search another name, email, or phone number." : "Create an internal admin or ops user to begin account management."}
              actionLabel={hasFilters ? "Clear Filters" : undefined}
              onAction={hasFilters ? () => setFilters(initialFilters) : undefined}
            />
          ) : null}
        </div>
      </Card>

      <section className={styles.workspace}>
        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>{selectedDetail ? "Update Profile" : "Create User"}</span>
              <h2>{selectedDetail?.user.fullName || "New internal account"}</h2>
            </div>
            <Badge tone="trust">{formatLabel(form.role)}</Badge>
          </div>

          <AdminUserForm form={form} options={options} onChange={updateForm} />

          <div className={styles.actions}>
            <Button
              type="button"
              disabled={!canSubmitUser}
              isLoading={pendingAction === "create"}
              onClick={() => void runAction("create", () => adminUsersService.createUser(form, selectedPermissions), "Admin user created")}
            >
              Create User
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!selectedDetail}
              isLoading={pendingAction === "profile"}
              onClick={() => selectedDetail && void runAction("profile", () => adminUsersService.updateProfile(selectedDetail.user.id, form), "User profile updated")}
            >
              Update Profile
            </Button>
          </div>
        </Card>

        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Account Status</span>
              <h2>{selectedDetail?.user.email || "Select a user"}</h2>
            </div>
            <Badge tone={toneForStatus(selectedDetail?.user.accountStatus)}>{formatLabel(selectedDetail?.user.accountStatus)}</Badge>
          </div>

          <div className={styles.statusGrid}>
            {(options?.statuses ?? ["active", "pending", "blocked", "suspended"]).map((status) => (
              <ConfirmAction
                label={formatLabel(status)}
                confirmLabel={`Confirm ${formatLabel(status)}`}
                variant={status === "blocked" || status === "suspended" ? "danger" : "secondary"}
                key={status}
                disabled={!selectedDetail?.guidance.canUpdateStatus}
                isLoading={pendingAction === `status:${status}`}
                onConfirm={() => selectedDetail && void runAction(`status:${status}`, () => adminUsersService.updateStatus(selectedDetail.user.id, status), `Status updated to ${status}`)}
              />
            ))}
          </div>

          <div className={styles.securityCard}>
            <span>Self protection</span>
            <strong>{selectedDetail?.guidance.isSelf ? "Self account selected" : "Safe to manage"}</strong>
            <p>Backend prevents admins from changing their own status and from removing their own admin write permission.</p>
          </div>
        </Card>
      </section>

      <Card padding="lg" className={styles.permissionPanel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>Permission Matrix</span>
            <h2>Access boundaries by module</h2>
          </div>
          <Badge tone="navy">{selectedPermissions.length} selected</Badge>
        </div>

        <div className={styles.permissionSummary}>
          <ProgressBar value={coverage} label="Selected permission coverage" showValue tone="trust" />
          <ConfirmAction
            label="Update Permissions"
            confirmLabel="Confirm Permissions"
            size="md"
            disabled={!selectedDetail?.guidance.canUpdatePermissions || !selectedPermissions.length}
            isLoading={pendingAction === "permissions"}
            onConfirm={() => selectedDetail && void runAction("permissions", () => adminUsersService.updatePermissions(selectedDetail.user.id, selectedPermissions), "Permissions updated")}
          />
        </div>

        <div className={styles.permissionGrid}>
          {Object.entries(permissionGroups).map(([group, permissions]) => (
            <div className={styles.permissionGroup} key={group}>
              <strong>{formatLabel(group)}</strong>
              {permissions.map((permission) => (
                <label key={permission} className={styles.permissionItem}>
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                  />
                  <span>{permission}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      </Card>

      <section className={styles.moduleGrid}>
        {(dashboard?.modules ?? []).map((module) => (
          <article className={styles.moduleCard} key={module.key}>
            <span>{module.label}</span>
            <strong>{module.requiredPermission}</strong>
            <p>{module.description}</p>
          </article>
        ))}
      </section>
    </section>
  );
}

function AdminUserForm({
  form,
  options,
  onChange
}: {
  form: AdminCreateFormState;
  options: AdminOptions | null;
  onChange: (field: keyof AdminCreateFormState, value: string) => void;
}) {
  return (
    <div className={styles.form}>
      <label className={styles.field}>
        <span>Role</span>
        <select value={form.role} onChange={(event) => onChange("role", event.target.value)}>
          {(options?.roles ?? ["ops", "admin", "driver"]).map((role) => <option value={role} key={role}>{formatLabel(role)}</option>)}
        </select>
      </label>
      <label className={styles.field}>
        <span>Status</span>
        <select value={form.accountStatus} onChange={(event) => onChange("accountStatus", event.target.value)}>
          {(options?.statuses ?? ["active", "pending", "blocked", "suspended"]).map((status) => <option value={status} key={status}>{formatLabel(status)}</option>)}
        </select>
      </label>
      <label className={styles.field}>
        <span>Full Name</span>
        <input value={form.fullName} onChange={(event) => onChange("fullName", event.target.value)} />
      </label>
      <label className={styles.field}>
        <span>Email</span>
        <input value={form.email} onChange={(event) => onChange("email", event.target.value)} />
      </label>
      <label className={styles.field}>
        <span>Phone</span>
        <input value={form.phone} onChange={(event) => onChange("phone", event.target.value)} />
      </label>
      <label className={styles.field}>
        <span>Employee Code</span>
        <input value={form.employeeCode} onChange={(event) => onChange("employeeCode", event.target.value)} />
      </label>
      <label className={styles.field}>
        <span>Department</span>
        <input value={form.department} onChange={(event) => onChange("department", event.target.value)} />
      </label>
      <label className={styles.field}>
        <span>Service Zone</span>
        <input value={form.serviceZone} onChange={(event) => onChange("serviceZone", event.target.value)} />
      </label>
      <label className={styles.field}>
        <span>Password</span>
        <input type="password" value={form.password} onChange={(event) => onChange("password", event.target.value)} />
      </label>
    </div>
  );
}

const formatLabel = (value: string | null | undefined) =>
  (value || "not_available").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const toneForStatus = (status: string | null | undefined) => {
  if (status === "active") {
    return "success";
  }

  if (status === "pending") {
    return "warning";
  }

  if (status === "blocked" || status === "suspended") {
    return "danger";
  }

  return "neutral";
};

const resolveErrorMessage = (caughtError: unknown) => {
  if (caughtError instanceof Error) {
    return caughtError.message;
  }

  return "Admin users data could not be loaded";
};
