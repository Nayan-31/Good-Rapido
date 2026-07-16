import { AUTH_ACCOUNT_STATUSES } from '../../public/auth/auth.constants.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_ROLES
} from '../../private/auth/auth.constants.js';
import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    buildPaymentIntent,
    buildWalletSummary,
    calculateRefundPreview
} from './payment-engine.engine.js';
import {
    toPaymentEngineIntent,
    toPaymentEngineOptions,
    toPaymentEngineRefundPreview
} from './dto/payment-engine.dto.js';

export default class PaymentEngineService {
    constructor({ paymentEngineDao, now = () => new Date() }) {
        this.paymentEngineDao = paymentEngineDao;
        this.now = now;
    }

    options(authContext) {
        this.assertAuthenticatedContext(authContext);

        return buildSuccessResponse({
            message: 'Payment engine options fetched successfully',
            data: {
                options: toPaymentEngineOptions(buildWalletSummary())
            }
        });
    }

    async previewIntent(authContext, payload) {
        await this.getAccountContext(authContext);
        const intent = buildPaymentIntent({
            ...payload,
            requestedAt: payload.requestedAt || this.now()
        });

        return buildSuccessResponse({
            message: 'Payment intent preview calculated successfully',
            data: {
                intent: toPaymentEngineIntent(intent)
            }
        });
    }

    async previewRefund(authContext, payload) {
        await this.getAccountContext(authContext);
        const preview = calculateRefundPreview({
            ...payload,
            requestedAt: payload.requestedAt || this.now()
        });

        return buildSuccessResponse({
            message: 'Refund preview calculated successfully',
            data: {
                refund: toPaymentEngineRefundPreview(preview)
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
        const user = toPlainObject(await this.paymentEngineDao.findPublicUserById(authContext.userId));

        if (!user) {
            throw AppError.notFound('Public payment account not found');
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
            throw AppError.forbidden('Payment engine private access is restricted to admin and ops users');
        }

        const user = toPlainObject(await this.paymentEngineDao.findPrivateUserById(authContext.userId));

        if (!user) {
            throw AppError.notFound('Private payment account not found');
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
