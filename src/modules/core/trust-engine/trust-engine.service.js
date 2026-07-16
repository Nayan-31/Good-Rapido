import { AUTH_ACCOUNT_STATUSES } from '../../public/auth/auth.constants.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../../private/auth/auth.constants.js';
import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    buildDriverTrustInsights,
    buildRideTrustSignals,
    buildTrustAssessment
} from './trust-engine.engine.js';
import {
    toTrustEngineAssessment,
    toTrustEngineDriverEvaluation,
    toTrustEngineOptions
} from './dto/trust-engine.dto.js';

export default class TrustEngineService {
    constructor({ trustEngineDao }) {
        this.trustEngineDao = trustEngineDao;
    }

    options(authContext) {
        this.assertAuthenticatedContext(authContext);

        return buildSuccessResponse({
            message: 'Trust engine options fetched successfully',
            data: {
                options: toTrustEngineOptions()
            }
        });
    }

    async assess(authContext, payload) {
        await this.getPrivateTrustReadContext(authContext);
        const assessment = buildTrustAssessment(payload);

        return buildSuccessResponse({
            message: 'Trust assessment calculated successfully',
            data: {
                assessment: toTrustEngineAssessment(assessment)
            }
        });
    }

    async evaluateDriver(authContext, payload) {
        await this.getAccountContext(authContext);
        const insights = buildDriverTrustInsights(payload.driver);
        const signals = buildRideTrustSignals({
            driver: payload.driver,
            fareSource: payload.fareSource || {}
        });

        return buildSuccessResponse({
            message: 'Driver trust evaluation calculated successfully',
            data: {
                evaluation: toTrustEngineDriverEvaluation({
                    driver: payload.driver,
                    insights,
                    signals
                })
            }
        });
    }

    async getAccountContext(authContext) {
        this.assertAuthenticatedContext(authContext);

        if (authContext.scope === 'private') {
            return this.getPrivateTrustReadContext(authContext);
        }

        return this.getPublicAccountContext(authContext);
    }

    async getPublicAccountContext(authContext) {
        const user = toPlainObject(await this.trustEngineDao.findPublicUserById(authContext.userId));

        if (!user) {
            throw AppError.notFound('Public trust account not found');
        }

        if (user.accountStatus !== AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`Public account is ${user.accountStatus}`);
        }

        return user;
    }

    async getPrivateTrustReadContext(authContext) {
        this.assertAuthenticatedContext(authContext);

        if (![
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ].includes(authContext.role)) {
            throw AppError.forbidden('Trust engine private access is restricted to admin and ops users');
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.TRUST_READ)) {
            throw AppError.forbidden('Trust read permission is required');
        }

        const user = toPlainObject(await this.trustEngineDao.findPrivateUserById(authContext.userId));

        if (!user) {
            throw AppError.notFound('Private trust account not found');
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
