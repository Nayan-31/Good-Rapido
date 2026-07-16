import { AUTH_ACCOUNT_STATUSES } from '../../public/auth/auth.constants.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../../private/auth/auth.constants.js';
import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    buildNotificationDeliveryPlan,
    buildNotificationPayload
} from './notification-engine.engine.js';
import {
    toNotificationEngineComposition,
    toNotificationEngineDeliveryPlan,
    toNotificationEngineOptions
} from './dto/notification-engine.dto.js';

export default class NotificationEngineService {
    constructor({ notificationEngineDao, now = () => new Date() }) {
        this.notificationEngineDao = notificationEngineDao;
        this.now = now;
    }

    options(authContext) {
        this.assertAuthenticatedContext(authContext);

        return buildSuccessResponse({
            message: 'Notification engine options fetched successfully',
            data: {
                options: toNotificationEngineOptions()
            }
        });
    }

    async planDelivery(authContext, payload) {
        await this.getAccountContext(authContext);
        const plan = buildNotificationDeliveryPlan({
            ...payload,
            requestedAt: payload.requestedAt || this.now()
        });

        return buildSuccessResponse({
            message: 'Notification delivery plan calculated successfully',
            data: {
                plan: toNotificationEngineDeliveryPlan(plan)
            }
        });
    }

    async compose(authContext, payload) {
        const actor = await this.getPrivateNotificationOpsContext(authContext);
        const notification = buildNotificationPayload(payload, {
            actor,
            now: this.now(),
            recipient: payload.recipient
        });

        return buildSuccessResponse({
            message: 'Notification composition calculated successfully',
            data: {
                notification: toNotificationEngineComposition(notification)
            }
        });
    }

    async getAccountContext(authContext) {
        this.assertAuthenticatedContext(authContext);

        if (authContext.scope === 'private') {
            return this.getPrivateNotificationOpsContext(authContext, { requirePermission: false });
        }

        return this.getPublicAccountContext(authContext);
    }

    async getPublicAccountContext(authContext) {
        const user = toPlainObject(await this.notificationEngineDao.findPublicUserById(authContext.userId));

        if (!user) {
            throw AppError.notFound('Public notification account not found');
        }

        if (user.accountStatus !== AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`Public account is ${user.accountStatus}`);
        }

        return user;
    }

    async getPrivateNotificationOpsContext(authContext, { requirePermission = true } = {}) {
        if (![
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ].includes(authContext.role)) {
            throw AppError.forbidden('Notification engine private access is restricted to admin and ops users');
        }

        if (
            requirePermission
            && !authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.OPS_NOTIFICATIONS_WRITE)
        ) {
            throw AppError.forbidden('Notification ops permission is required');
        }

        const user = toPlainObject(await this.notificationEngineDao.findPrivateUserById(authContext.userId));

        if (!user) {
            throw AppError.notFound('Private notification account not found');
        }

        if (user.accountStatus !== PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`Private account is ${user.accountStatus}`);
        }

        return user;
    }

    assertAuthenticatedContext(authContext) {
        if (!authContext?.userId || !authContext?.role || !authContext?.scope) {
            throw AppError.unauthorized();
        }
    }
}

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;
