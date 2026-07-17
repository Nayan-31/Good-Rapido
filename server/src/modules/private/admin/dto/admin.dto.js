import {
    DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../../auth/auth.constants.js';
import {
    ADMIN_DASHBOARD_MODULES,
    ADMIN_MANAGED_PERMISSIONS,
    ADMIN_MANAGED_ROLES,
    ADMIN_MANAGED_STATUSES
} from '../admin.constants.js';

export const toAdminOptions = () => ({
    roles: ADMIN_MANAGED_ROLES,
    statuses: ADMIN_MANAGED_STATUSES,
    permissions: ADMIN_MANAGED_PERMISSIONS,
    defaultRolePermissions: DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    dashboardModules: ADMIN_DASHBOARD_MODULES
});

export const toAdminUser = (user = {}) => {
    const userObject = user.toObject ? user.toObject() : user;

    return {
        id: userObject._id?.toString?.() || userObject.id || null,
        role: userObject.role || null,
        fullName: userObject.fullName || null,
        email: userObject.email || null,
        phone: userObject.phone || null,
        employeeCode: userObject.employeeCode || null,
        department: userObject.department || null,
        serviceZone: userObject.serviceZone || null,
        permissions: Array.isArray(userObject.permissions) ? userObject.permissions : [],
        accountStatus: userObject.accountStatus || null,
        lastLoginAt: userObject.lastLoginAt || null,
        createdAt: userObject.createdAt || null,
        updatedAt: userObject.updatedAt || null
    };
};

export const toAdminUserListItem = (user = {}) => {
    const publicUser = toAdminUser(user);

    return {
        id: publicUser.id,
        role: publicUser.role,
        fullName: publicUser.fullName,
        email: publicUser.email,
        phone: publicUser.phone,
        employeeCode: publicUser.employeeCode,
        department: publicUser.department,
        serviceZone: publicUser.serviceZone,
        accountStatus: publicUser.accountStatus,
        permissionCount: publicUser.permissions.length,
        lastLoginAt: publicUser.lastLoginAt,
        createdAt: publicUser.createdAt
    };
};

export const toAdminUserSummary = (summary = {}) => ({
    totalUsers: numberOrZero(summary.totalUsers),
    activeCount: numberOrZero(summary.activeCount),
    pendingCount: numberOrZero(summary.pendingCount),
    blockedCount: numberOrZero(summary.blockedCount),
    suspendedCount: numberOrZero(summary.suspendedCount),
    driverCount: numberOrZero(summary.driverCount),
    adminCount: numberOrZero(summary.adminCount),
    opsCount: numberOrZero(summary.opsCount),
    byRole: normalizeEnumCounts(summary.byRole, Object.values(PRIVATE_AUTH_ROLES)),
    byStatus: normalizeEnumCounts(summary.byStatus, Object.values(PRIVATE_AUTH_ACCOUNT_STATUSES)),
    latestUserCreatedAt: summary.latestUserCreatedAt || null
});

export const toAdminDashboard = (summary = {}) => ({
    summary: toAdminUserSummary(summary),
    modules: ADMIN_DASHBOARD_MODULES,
    recentUsers: Array.isArray(summary.recentUsers)
        ? summary.recentUsers.map(toAdminUserListItem)
        : []
});

export const toAdminUserGuidance = (user = {}, authContext = {}) => ({
    isSelf: getId(user) === authContext.userId,
    canUpdateStatus: getId(user) !== authContext.userId,
    canUpdatePermissions: getId(user) !== authContext.userId || hasAdminWrite(user.permissions),
    defaultPermissions: DEFAULT_PRIVATE_ROLE_PERMISSIONS[user.role] || []
});

const normalizeEnumCounts = (counts = {}, keys = []) => keys.reduce((result, key) => ({
    ...result,
    [key]: numberOrZero(counts[key])
}), {});

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const hasAdminWrite = (permissions = []) => Array.isArray(permissions)
    && permissions.includes(PRIVATE_AUTH_PERMISSIONS.ADMIN_USERS_WRITE);

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;
