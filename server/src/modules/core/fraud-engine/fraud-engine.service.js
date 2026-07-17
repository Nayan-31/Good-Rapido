import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../../private/auth/auth.constants.js';
import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    buildFraudAssessment,
    buildFraudGuidance,
    recommendedFraudActionsFor
} from './fraud-engine.engine.js';
import {
    toFraudEngineAssessment,
    toFraudEngineOptions
} from './dto/fraud-engine.dto.js';

export default class FraudEngineService {
    constructor({ fraudEngineDao }) {
        this.fraudEngineDao = fraudEngineDao;
    }

    options(authContext) {
        this.assertFraudReadContext(authContext);

        return buildSuccessResponse({
            message: 'Fraud engine options fetched successfully',
            data: {
                options: toFraudEngineOptions()
            }
        });
    }

    async assess(authContext, payload) {
        await this.getPrivateFraudReadContext(authContext);
        const assessment = buildFraudAssessment(payload);
        const actions = recommendedFraudActionsFor(assessment);
        const guidance = buildFraudGuidance(assessment);

        return buildSuccessResponse({
            message: 'Fraud assessment calculated successfully',
            data: {
                assessment: toFraudEngineAssessment({
                    ...assessment,
                    actions,
                    guidance
                })
            }
        });
    }

    async getPrivateFraudReadContext(authContext) {
        this.assertFraudReadContext(authContext);

        const user = toPlainObject(await this.fraudEngineDao.findPrivateUserById(authContext.userId));

        if (!user) {
            throw AppError.notFound('Private fraud account not found');
        }

        if (user.accountStatus !== PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`Private account is ${user.accountStatus}`);
        }

        return user;
    }

    assertFraudReadContext(authContext) {
        if (!authContext?.userId || !authContext?.role || !authContext?.scope) {
            throw AppError.unauthorized();
        }

        if (![
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ].includes(authContext.role)) {
            throw AppError.forbidden('Fraud engine private access is restricted to admin and ops users');
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.FRAUD_READ)) {
            throw AppError.forbidden('Fraud read permission is required');
        }

        return authContext;
    }
}

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;
