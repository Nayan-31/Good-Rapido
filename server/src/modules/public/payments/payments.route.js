import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import { createAuthGuard } from '../auth/session/auth-guard.middleware.js';
import TokenService from '../auth/session/token.service.js';
import RidesDao from '../rides/rides.dao.js';
import PaymentsController from './payments.controller.js';
import PaymentsDao from './payments.dao.js';
import PaymentsService from './payments.service.js';
import {
    paymentHistoryQuerySchema,
    paymentParamsSchema,
    refundPaymentSchema,
    ridePaymentSchema
} from './validators/payments.validator.js';

const createPaymentsDependencies = ({
    paymentsDao = new PaymentsDao(),
    ridesDao = new RidesDao(),
    tokenService = new TokenService(),
    now = () => new Date()
} = {}) => ({
    paymentsDao,
    ridesDao,
    tokenService,
    now
});

export const createPaymentsRouter = (dependencies = createPaymentsDependencies()) => {
    const router = Router();
    const { paymentsDao, ridesDao, tokenService, now } = dependencies;
    const paymentsService = new PaymentsService({ paymentsDao, ridesDao, now });
    const paymentsController = new PaymentsController(paymentsService);
    const requireAuth = createAuthGuard({
        tokenService,
        allowedRoles: Object.values(AUTH_ROLES)
    });

    router.use(requireAuth);

    router.get('/methods', paymentsController.listMethods);
    router.get('/wallet', paymentsController.getWallet);
    router.get('/history', validate(paymentHistoryQuerySchema), paymentsController.history);
    router.post('/rides/:rideId/pay', validate(ridePaymentSchema), paymentsController.payRide);
    router.post('/:paymentId/refund', validate(refundPaymentSchema), paymentsController.requestRefund);
    router.get('/:paymentId', validate(paymentParamsSchema), paymentsController.getPayment);

    return router;
};

export default createPaymentsRouter();
