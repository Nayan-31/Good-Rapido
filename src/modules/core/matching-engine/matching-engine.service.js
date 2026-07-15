import { AUTH_ACCOUNT_STATUSES } from '../../public/auth/auth.constants.js';
import { FARE_VEHICLE_TYPES } from '../../public/fare/fare.constants.js';
import { RIDE_BOOKING_DRIVER_POOL } from '../../public/ride-booking/ride-booking.constants.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../../private/auth/auth.constants.js';
import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import { buildDriverMatches } from './matching-engine.engine.js';
import {
    MATCHING_ENGINE_DEFAULT_LIMIT,
    MATCHING_ENGINE_DEFAULT_SERVICE_ZONE
} from './matching-engine.constants.js';
import {
    toMatchingEngineOptions,
    toMatchingEngineResult
} from './dto/matching-engine.dto.js';

export default class MatchingEngineService {
    constructor({ matchingEngineDao, fallbackDrivers = RIDE_BOOKING_DRIVER_POOL, now = () => new Date() }) {
        this.matchingEngineDao = matchingEngineDao;
        this.fallbackDrivers = fallbackDrivers;
        this.now = now;
    }

    options(authContext) {
        this.assertAuthenticatedContext(authContext);

        return buildSuccessResponse({
            message: 'Matching engine options fetched successfully',
            data: {
                options: toMatchingEngineOptions({
                    vehicleTypes: Object.values(FARE_VEHICLE_TYPES)
                })
            }
        });
    }

    async match(authContext, payload) {
        await this.getAccountContext(authContext);
        const liveDrivers = toPlainArray(await this.matchingEngineDao.findAvailableDrivers({
            vehicleType: payload.vehicleType,
            serviceZone: payload.serviceZone || MATCHING_ENGINE_DEFAULT_SERVICE_ZONE,
            limit: payload.limit || MATCHING_ENGINE_DEFAULT_LIMIT
        }));
        const drivers = liveDrivers.length ? liveDrivers : this.fallbackDrivers;
        const result = buildDriverMatches({
            pickup: payload.pickup,
            vehicleType: payload.vehicleType,
            serviceZone: payload.serviceZone || MATCHING_ENGINE_DEFAULT_SERVICE_ZONE,
            drivers,
            limit: payload.limit || MATCHING_ENGINE_DEFAULT_LIMIT,
            now: this.now()
        });

        return buildSuccessResponse({
            message: 'Driver matches calculated successfully',
            data: {
                matching: toMatchingEngineResult(result)
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
        const user = toPlainObject(await this.matchingEngineDao.findPublicUserById(authContext.userId));

        if (!user) {
            throw AppError.notFound('Public matching account not found');
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
            throw AppError.forbidden('Matching engine private access is restricted to admin and ops users');
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.OPS_RIDES_READ)) {
            throw AppError.forbidden('Ride ops read permission is required');
        }

        const user = toPlainObject(await this.matchingEngineDao.findPrivateUserById(authContext.userId));

        if (!user) {
            throw AppError.notFound('Private matching account not found');
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

const toPlainArray = (documents = []) => documents.map((document) => toPlainObject(document));
