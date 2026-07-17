import { AUTH_ACCOUNT_STATUSES } from '../../public/auth/auth.constants.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../../private/auth/auth.constants.js';
import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    PRICING_ENGINE_DEFAULT_SERVICE_ZONE,
    PRICING_ENGINE_RULE_SOURCES
} from './pricing-engine.constants.js';
import {
    allPricingEngineVehicleTypes,
    baselinePricingRuleFor,
    buildPricingQuote
} from './pricing-engine.engine.js';
import {
    toPricingEngineComparison,
    toPricingEngineOptions,
    toPricingEngineQuote
} from './dto/pricing-engine.dto.js';

export default class PricingEngineService {
    constructor({ pricingEngineDao, now = () => new Date() }) {
        this.pricingEngineDao = pricingEngineDao;
        this.now = now;
    }

    options(authContext) {
        this.assertAuthenticatedContext(authContext);

        return buildSuccessResponse({
            message: 'Pricing engine options fetched successfully',
            data: {
                options: toPricingEngineOptions()
            }
        });
    }

    async quote(authContext, payload) {
        await this.getAccountContext(authContext);
        const quote = await this.buildQuote(payload);

        return buildSuccessResponse({
            message: 'Pricing quote calculated successfully',
            data: {
                quote: toPricingEngineQuote(quote)
            }
        });
    }

    async compare(authContext, payload) {
        await this.getAccountContext(authContext);
        const requestedAt = payload.requestedAt || this.now();
        const serviceZone = payload.serviceZone || PRICING_ENGINE_DEFAULT_SERVICE_ZONE;
        const vehicleTypes = payload.vehicleTypes?.length
            ? payload.vehicleTypes
            : allPricingEngineVehicleTypes();
        const quotes = [];

        for (const vehicleType of vehicleTypes) {
            quotes.push(await this.buildQuote({
                ...payload,
                vehicleType,
                serviceZone,
                requestedAt
            }));
        }

        return buildSuccessResponse({
            message: 'Pricing comparison calculated successfully',
            data: {
                comparison: toPricingEngineComparison({
                    quotes,
                    requestedAt,
                    serviceZone
                })
            }
        });
    }

    async buildQuote(payload) {
        const requestedAt = payload.requestedAt || this.now();
        const serviceZone = normalizeServiceZone(payload.serviceZone);
        const pricingRule = await this.findBestPricingRule({
            vehicleType: payload.vehicleType,
            serviceZone,
            requestedAt
        });

        return buildPricingQuote({
            pickup: payload.pickup,
            dropoff: payload.dropoff,
            vehicleType: payload.vehicleType,
            serviceZone,
            requestedAt,
            pricingRule,
            now: this.now()
        });
    }

    async findBestPricingRule({ vehicleType, serviceZone, requestedAt }) {
        const activeRule = toPlainObject(await this.pricingEngineDao.findActivePricingRule({
            vehicleType,
            serviceZone,
            now: requestedAt
        }));

        if (activeRule) {
            return {
                ...activeRule,
                source: PRICING_ENGINE_RULE_SOURCES.ACTIVE_RULE
            };
        }

        if (serviceZone !== PRICING_ENGINE_DEFAULT_SERVICE_ZONE) {
            const defaultRule = toPlainObject(await this.pricingEngineDao.findActivePricingRule({
                vehicleType,
                serviceZone: PRICING_ENGINE_DEFAULT_SERVICE_ZONE,
                now: requestedAt
            }));

            if (defaultRule) {
                return {
                    ...defaultRule,
                    source: PRICING_ENGINE_RULE_SOURCES.DEFAULT_RULE
                };
            }
        }

        return baselinePricingRuleFor(vehicleType, serviceZone);
    }

    async getAccountContext(authContext) {
        this.assertAuthenticatedContext(authContext);

        if (authContext.scope === 'private') {
            return this.getPrivateAccountContext(authContext);
        }

        return this.getPublicAccountContext(authContext);
    }

    async getPublicAccountContext(authContext) {
        const user = toPlainObject(await this.pricingEngineDao.findPublicUserById(authContext.userId));

        if (!user) {
            throw AppError.notFound('Public pricing account not found');
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
            throw AppError.forbidden('Pricing engine private access is restricted to admin and ops users');
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.PRICING_READ)) {
            throw AppError.forbidden('Pricing read permission is required');
        }

        const user = toPlainObject(await this.pricingEngineDao.findPrivateUserById(authContext.userId));

        if (!user) {
            throw AppError.notFound('Private pricing account not found');
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

const normalizeServiceZone = (serviceZone) => serviceZone?.trim?.().toLowerCase() || PRICING_ENGINE_DEFAULT_SERVICE_ZONE;

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;
