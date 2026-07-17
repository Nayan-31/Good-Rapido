import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS
} from '../auth/auth.constants.js';
import {
    toAdminDashboard,
    toAdminOptions,
    toAdminUser,
    toAdminUserGuidance,
    toAdminUserListItem,
    toAdminUserSummary
} from './dto/admin.dto.js';

export default class AdminService {
    constructor({ adminDao, passwordService }) {
        this.adminDao = adminDao;
        this.passwordService = passwordService;
    }

    options(authContext) {
        this.assertAdminContext(authContext);

        return buildSuccessResponse({
            message: 'Admin options fetched successfully',
            data: {
                options: toAdminOptions()
            }
        });
    }

    async dashboard(authContext) {
        this.assertAdminContext(authContext);
        const summary = normalizeDashboardSummary(await this.adminDao.findDashboardSummary());

        return buildSuccessResponse({
            message: 'Admin dashboard fetched successfully',
            data: {
                dashboard: toAdminDashboard(summary)
            }
        });
    }

    async listUsers(authContext, query = {}) {
        this.assertAdminContext(authContext);
        const users = await this.adminDao.findUsers(query);
        const plainUsers = users.map(toPlainObject);

        return buildSuccessResponse({
            message: 'Private users fetched successfully',
            data: {
                users: plainUsers.map(toAdminUserListItem),
                summary: toAdminUserSummary(buildSummaryFromUsers(plainUsers))
            }
        });
    }

    async getUser(authContext, userId) {
        const user = await this.findUser(authContext, userId);

        return buildSuccessResponse({
            message: 'Private user fetched successfully',
            data: {
                user: toAdminUser(user),
                guidance: toAdminUserGuidance(user, authContext)
            }
        });
    }

    async createUser(authContext, payload) {
        this.assertAdminContext(authContext);
        const normalizedPayload = this.normalizeCreatePayload(payload);
        await this.assertUniqueContact(normalizedPayload.role, normalizedPayload);
        const passwordHash = await this.passwordService.hash(normalizedPayload.password);

        let user;

        try {
            user = await this.adminDao.createUser({
                role: normalizedPayload.role,
                fullName: normalizedPayload.fullName,
                email: normalizedPayload.email,
                phone: normalizedPayload.phone,
                employeeCode: normalizedPayload.employeeCode,
                department: normalizedPayload.department,
                serviceZone: normalizedPayload.serviceZone,
                permissions: normalizedPayload.permissions || defaultPermissions(normalizedPayload.role),
                accountStatus: normalizedPayload.accountStatus || PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE,
                passwordHash
            });
        } catch (err) {
            if (err.code === 11000) {
                throw AppError.conflict('Private user already exists with this contact');
            }

            throw err;
        }

        const userObject = toPlainObject(user);

        return buildSuccessResponse({
            statusCode: 201,
            message: 'Private user created successfully',
            data: {
                user: toAdminUser(userObject),
                guidance: toAdminUserGuidance(userObject, authContext)
            }
        });
    }

    async updateUser(authContext, userId, payload) {
        const existingUser = await this.findUser(authContext, userId);
        const normalizedPayload = this.normalizeUpdatePayload(payload);

        if (normalizedPayload.accountStatus) {
            this.assertCanChangeStatus(authContext, existingUser);
        }

        if (normalizedPayload.permissions) {
            this.assertCanChangePermissions(authContext, existingUser, normalizedPayload.permissions);
        }

        await this.assertUniqueContact(existingUser.role, normalizedPayload, getId(existingUser));

        const updatedUser = await this.adminDao.updateUser(userId, normalizedPayload);

        if (!updatedUser) {
            throw AppError.notFound('Private user not found');
        }

        const userObject = toPlainObject(updatedUser);

        return buildSuccessResponse({
            message: 'Private user updated successfully',
            data: {
                user: toAdminUser(userObject),
                guidance: toAdminUserGuidance(userObject, authContext)
            }
        });
    }

    async updateUserStatus(authContext, userId, payload) {
        const existingUser = await this.findUser(authContext, userId);
        this.assertCanChangeStatus(authContext, existingUser);

        const updatedUser = await this.adminDao.updateUser(userId, {
            accountStatus: payload.accountStatus
        });

        if (!updatedUser) {
            throw AppError.notFound('Private user not found');
        }

        const userObject = toPlainObject(updatedUser);

        return buildSuccessResponse({
            message: 'Private user status updated successfully',
            data: {
                user: toAdminUser(userObject),
                guidance: toAdminUserGuidance(userObject, authContext)
            }
        });
    }

    async updateUserPermissions(authContext, userId, payload) {
        const existingUser = await this.findUser(authContext, userId);
        const permissions = normalizePermissions(payload.permissions);
        this.assertCanChangePermissions(authContext, existingUser, permissions);

        const updatedUser = await this.adminDao.updateUser(userId, {
            permissions
        });

        if (!updatedUser) {
            throw AppError.notFound('Private user not found');
        }

        const userObject = toPlainObject(updatedUser);

        return buildSuccessResponse({
            message: 'Private user permissions updated successfully',
            data: {
                user: toAdminUser(userObject),
                guidance: toAdminUserGuidance(userObject, authContext)
            }
        });
    }

    async findUser(authContext, userId) {
        this.assertAdminContext(authContext);
        const user = await this.adminDao.findById(userId);

        if (!user) {
            throw AppError.notFound('Private user not found');
        }

        return toPlainObject(user);
    }

    async assertUniqueContact(role, payload, currentUserId = null) {
        if (!payload.email && !payload.phone && !payload.employeeCode) {
            return;
        }

        const existingUser = await this.adminDao.findExistingContact(role, payload);

        if (existingUser && getId(toPlainObject(existingUser)) !== currentUserId) {
            throw AppError.conflict('Private user already exists with this contact');
        }
    }

    assertAdminContext(authContext) {
        if (!authContext?.userId || !authContext?.role) {
            throw AppError.unauthorized();
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.ADMIN_USERS_READ)) {
            throw AppError.forbidden('Admin user read permission is required');
        }

        return authContext;
    }

    assertCanChangeStatus(authContext, user) {
        if (getId(user) === authContext.userId) {
            throw AppError.badRequest('Admins cannot change their own account status');
        }
    }

    assertCanChangePermissions(authContext, user, permissions) {
        if (getId(user) !== authContext.userId) {
            return;
        }

        if (!permissions.includes(PRIVATE_AUTH_PERMISSIONS.ADMIN_USERS_WRITE)) {
            throw AppError.badRequest('Admins cannot remove their own admin write permission');
        }
    }

    normalizeCreatePayload(payload) {
        return {
            role: payload.role,
            fullName: payload.fullName.trim(),
            email: payload.email ? payload.email.trim().toLowerCase() : undefined,
            phone: payload.phone.trim(),
            employeeCode: payload.employeeCode ? payload.employeeCode.trim().toUpperCase() : undefined,
            department: payload.department?.trim() || undefined,
            serviceZone: payload.serviceZone?.trim() || undefined,
            permissions: payload.permissions ? normalizePermissions(payload.permissions) : undefined,
            accountStatus: payload.accountStatus,
            password: payload.password
        };
    }

    normalizeUpdatePayload(payload) {
        const normalizedPayload = {};

        if (payload.fullName !== undefined) {
            normalizedPayload.fullName = payload.fullName.trim();
        }

        if (payload.email !== undefined) {
            normalizedPayload.email = payload.email ? payload.email.trim().toLowerCase() : undefined;
        }

        if (payload.phone !== undefined) {
            normalizedPayload.phone = payload.phone.trim();
        }

        if (payload.employeeCode !== undefined) {
            normalizedPayload.employeeCode = payload.employeeCode
                ? payload.employeeCode.trim().toUpperCase()
                : undefined;
        }

        if (payload.department !== undefined) {
            normalizedPayload.department = payload.department?.trim() || undefined;
        }

        if (payload.serviceZone !== undefined) {
            normalizedPayload.serviceZone = payload.serviceZone?.trim() || undefined;
        }

        if (payload.accountStatus !== undefined) {
            normalizedPayload.accountStatus = payload.accountStatus;
        }

        if (payload.permissions !== undefined) {
            normalizedPayload.permissions = normalizePermissions(payload.permissions);
        }

        return normalizedPayload;
    }
}

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const defaultPermissions = (role) => [...(DEFAULT_PRIVATE_ROLE_PERMISSIONS[role] || [])];

const normalizePermissions = (permissions = []) => [...new Set(permissions)];

const normalizeDashboardSummary = (summary = {}) => {
    const totals = summary.totals?.[0] || summary;

    return {
        totalUsers: totals.totalUsers || 0,
        activeCount: totals.activeCount || 0,
        pendingCount: totals.pendingCount || 0,
        blockedCount: totals.blockedCount || 0,
        suspendedCount: totals.suspendedCount || 0,
        driverCount: totals.driverCount || 0,
        adminCount: totals.adminCount || 0,
        opsCount: totals.opsCount || 0,
        byRole: rowsToCounts(summary.roles),
        byStatus: rowsToCounts(summary.statuses),
        latestUserCreatedAt: totals.latestUserCreatedAt || null,
        recentUsers: summary.recentUsers || []
    };
};

const buildSummaryFromUsers = (users = []) => users.reduce((summary, user) => {
    summary.totalUsers += 1;
    summary.byRole[user.role] = (summary.byRole[user.role] || 0) + 1;
    summary.byStatus[user.accountStatus] = (summary.byStatus[user.accountStatus] || 0) + 1;
    summary.latestUserCreatedAt = maxDate(summary.latestUserCreatedAt, user.createdAt);

    if (user.accountStatus === PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE) {
        summary.activeCount += 1;
    }

    if (user.accountStatus === PRIVATE_AUTH_ACCOUNT_STATUSES.PENDING) {
        summary.pendingCount += 1;
    }

    if (user.accountStatus === PRIVATE_AUTH_ACCOUNT_STATUSES.BLOCKED) {
        summary.blockedCount += 1;
    }

    if (user.accountStatus === PRIVATE_AUTH_ACCOUNT_STATUSES.SUSPENDED) {
        summary.suspendedCount += 1;
    }

    summary[`${user.role}Count`] = (summary[`${user.role}Count`] || 0) + 1;

    return summary;
}, {
    totalUsers: 0,
    activeCount: 0,
    pendingCount: 0,
    blockedCount: 0,
    suspendedCount: 0,
    driverCount: 0,
    adminCount: 0,
    opsCount: 0,
    byRole: {},
    byStatus: {},
    latestUserCreatedAt: null
});

const rowsToCounts = (rows = []) => rows.reduce((result, row) => ({
    ...result,
    [row._id]: row.count
}), {});

const maxDate = (left, right) => {
    if (!left) {
        return right || null;
    }

    if (!right) {
        return left;
    }

    return new Date(left) > new Date(right) ? left : right;
};
