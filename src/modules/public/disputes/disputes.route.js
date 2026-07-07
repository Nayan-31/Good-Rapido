import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import { createAuthGuard } from '../auth/session/auth-guard.middleware.js';
import TokenService from '../auth/session/token.service.js';
import RidesDao from '../rides/rides.dao.js';
import DisputesController from './disputes.controller.js';
import DisputesDao from './disputes.dao.js';
import DisputesService from './disputes.service.js';
import {
    addDisputeEvidenceSchema,
    cancelDisputeSchema,
    disputeHistoryQuerySchema,
    disputeParamsSchema,
    rideDisputeParamsSchema,
    submitRideDisputeSchema
} from './validators/disputes.validator.js';

const createDisputesDependencies = ({
    disputesDao = new DisputesDao(),
    ridesDao = new RidesDao(),
    tokenService = new TokenService(),
    now = () => new Date()
} = {}) => ({
    disputesDao,
    ridesDao,
    tokenService,
    now
});

export const createDisputesRouter = (dependencies = createDisputesDependencies()) => {
    const router = Router();
    const { disputesDao, ridesDao, tokenService, now } = dependencies;
    const disputesService = new DisputesService({ disputesDao, ridesDao, now });
    const disputesController = new DisputesController(disputesService);
    const requireAuth = createAuthGuard({
        tokenService,
        allowedRoles: Object.values(AUTH_ROLES)
    });

    router.use(requireAuth);

    router.get('/options', disputesController.options);
    router.get('/summary', disputesController.summary);
    router.get('/history', validate(disputeHistoryQuerySchema), disputesController.history);
    router.get('/rides/:rideId', validate(rideDisputeParamsSchema), disputesController.getRideDisputes);
    router.post('/rides/:rideId', validate(submitRideDisputeSchema), disputesController.submitRideDispute);
    router.post('/:disputeId/evidence', validate(addDisputeEvidenceSchema), disputesController.addEvidence);
    router.post('/:disputeId/cancel', validate(cancelDisputeSchema), disputesController.cancelDispute);
    router.get('/:disputeId', validate(disputeParamsSchema), disputesController.getDispute);

    return router;
};

export default createDisputesRouter();
