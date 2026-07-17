import { AUTH_ACCOUNT_STATUSES } from '../../public/auth/auth.constants.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../../private/auth/auth.constants.js';
import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import { buildRoutePlan } from './route-engine.engine.js';
import {
    ROUTE_ENGINE_DEFAULT_SERVICE_ZONE,
    ROUTE_ENGINE_ROUTE_PREFERENCES
} from './route-engine.constants.js';
import {
    toRouteEngineOptions,
    toRouteEnginePlan
} from './dto/route-engine.dto.js';

export default class RouteEngineService {
    constructor({ routeEngineDao, now = () => new Date() }) {
        this.routeEngineDao = routeEngineDao;
        this.now = now;
    }

    options(authContext) {
        this.assertAuthenticatedContext(authContext);

        return buildSuccessResponse({
            message: 'Route engine options fetched successfully',
            data: {
                options: toRouteEngineOptions()
            }
        });
    }

    async plan(authContext, payload) {
        await this.getAccountContext(authContext);
        const requestedAt = payload.requestedAt ? new Date(payload.requestedAt) : this.now();
        const plan = buildRoutePlan({
            pickup: payload.pickup,
            dropoff: payload.dropoff,
            waypoints: payload.waypoints || [],
            vehicleType: payload.vehicleType,
            routePreference: payload.routePreference || ROUTE_ENGINE_ROUTE_PREFERENCES.BALANCED,
            serviceZone: payload.serviceZone || ROUTE_ENGINE_DEFAULT_SERVICE_ZONE,
            requestedAt,
            now: this.now()
        });

        return buildSuccessResponse({
            message: 'Route plan calculated successfully',
            data: {
                route: toRouteEnginePlan(plan)
            }
        });
    }

    async getAccountContext(authContext) {
        this.assertAuthenticatedContext(authContext);

        if (authContext.scope === 'private') {
            return this.getPrivateAccountContext(authContext);
        }

        return this.getPublicAccountContext(authContext);
    }

    async getPublicAccountContext(authContext) {
        const user = toPlainObject(await this.routeEngineDao.findPublicUserById(authContext.userId));

        if (!user) {
            throw AppError.notFound('Public route account not found');
        }

        if (user.accountStatus !== AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`Public account is ${user.accountStatus}`);
        }

        return user;
    }

    async getPrivateAccountContext(authContext) {
        if (![
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ].includes(authContext.role)) {
            throw AppError.forbidden('Route engine private access is restricted to admin and ops users');
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.OPS_RIDES_READ)) {
            throw AppError.forbidden('Ride ops read permission is required');
        }

        const user = toPlainObject(await this.routeEngineDao.findPrivateUserById(authContext.userId));

        if (!user) {
            throw AppError.notFound('Private route account not found');
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
