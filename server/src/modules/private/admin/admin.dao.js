import mongoose from 'mongoose';
import PrivateAuthUser from './admin.model.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import {
    ADMIN_USER_LIST_DEFAULT_LIMIT,
    ADMIN_USER_LIST_MAX_LIMIT
} from './admin.constants.js';

export default class AdminDao {
    constructor(model = PrivateAuthUser) {
        this.model = model;
    }

    createUser(payload) {
        return this.model.create(payload);
    }

    findUsers({
        role,
        accountStatus,
        department,
        serviceZone,
        q,
        limit = ADMIN_USER_LIST_DEFAULT_LIMIT
    } = {}) {
        const filter = {};

        if (role) {
            filter.role = role;
        }

        if (accountStatus) {
            filter.accountStatus = accountStatus;
        }

        if (department) {
            filter.department = department;
        }

        if (serviceZone) {
            filter.serviceZone = serviceZone;
        }

        if (q) {
            const regex = new RegExp(escapeRegex(q), 'i');

            filter.$or = [
                { fullName: regex },
                { email: regex },
                { phone: regex },
                { employeeCode: regex }
            ];
        }

        return this.model
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(Math.min(limit, ADMIN_USER_LIST_MAX_LIMIT));
    }

    findById(userId, projection = null) {
        if (!mongoose.isValidObjectId(userId)) {
            return null;
        }

        const query = this.model.findById(userId);
        return projection ? query.select(projection) : query;
    }

    findExistingContact(role, { email, phone, employeeCode }) {
        const contactFilters = [];

        if (email) {
            contactFilters.push({ email });
        }

        if (phone) {
            contactFilters.push({ phone });
        }

        if (employeeCode) {
            contactFilters.push({ employeeCode });
        }

        if (!contactFilters.length) {
            return null;
        }

        return this.model.findOne({ role, $or: contactFilters });
    }

    updateUser(userId, payload) {
        if (!mongoose.isValidObjectId(userId)) {
            return null;
        }

        return this.model.findOneAndUpdate(
            { _id: userId },
            { $set: payload },
            { returnDocument: 'after', runValidators: true }
        );
    }

    async findDashboardSummary() {
        const [summary] = await this.model.aggregate([
            {
                $facet: {
                    totals: [
                        {
                            $group: {
                                _id: null,
                                totalUsers: { $sum: 1 },
                                activeCount: countStatus(PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE),
                                pendingCount: countStatus(PRIVATE_AUTH_ACCOUNT_STATUSES.PENDING),
                                blockedCount: countStatus(PRIVATE_AUTH_ACCOUNT_STATUSES.BLOCKED),
                                suspendedCount: countStatus(PRIVATE_AUTH_ACCOUNT_STATUSES.SUSPENDED),
                                driverCount: countRole(PRIVATE_AUTH_ROLES.DRIVER),
                                adminCount: countRole(PRIVATE_AUTH_ROLES.ADMIN),
                                opsCount: countRole(PRIVATE_AUTH_ROLES.OPS),
                                latestUserCreatedAt: { $max: '$createdAt' }
                            }
                        }
                    ],
                    roles: [
                        {
                            $group: {
                                _id: '$role',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    statuses: [
                        {
                            $group: {
                                _id: '$accountStatus',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    recentUsers: [
                        { $sort: { createdAt: -1 } },
                        { $limit: 5 },
                        {
                            $project: {
                                passwordHash: 0,
                                refreshTokenHash: 0
                            }
                        }
                    ]
                }
            }
        ]);

        return summary || { totals: [], roles: [], statuses: [], recentUsers: [] };
    }
}

const countStatus = (status) => ({
    $sum: {
        $cond: [{ $eq: ['$accountStatus', status] }, 1, 0]
    }
});

const countRole = (role) => ({
    $sum: {
        $cond: [{ $eq: ['$role', role] }, 1, 0]
    }
});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
