import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import {
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import { createPrivateAuthGuard } from '../auth/session/auth-guard.middleware.js';
import PrivateTokenService from '../auth/session/token.service.js';
import PrivateDisputesController from './disputes.controller.js';
import PrivateDisputesDao from './disputes.dao.js';
import PrivateDisputesService from './disputes.service.js';
import {
    addPrivateDisputeNoteSchema,
    assignPrivateDisputeSchema,
    privateDisputeParamsSchema,
    privateDisputeQuerySchema,
    rejectPrivateDisputeSchema,
    requestDisputeEvidenceSchema,
    resolvePrivateDisputeSchema,
    updatePrivateDisputeStateSchema
} from './validators/disputes.validator.js';

const createPrivateDisputesDependencies = ({
    disputesDao = new PrivateDisputesDao(),
    tokenService = new PrivateTokenService(),
    now = () => new Date()
} = {}) => ({
    disputesDao,
    tokenService,
    now
});

export const createPrivateDisputesRouter = (dependencies = createPrivateDisputesDependencies()) => {
    const router = Router();
    const { disputesDao, tokenService, now } = dependencies;
    const disputesService = new PrivateDisputesService({ disputesDao, now });
    const disputesController = new PrivateDisputesController(disputesService);
    const requireDisputeRead = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.ADMIN, PRIVATE_AUTH_ROLES.OPS],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.OPS_DISPUTES_READ]
    });
    const requireDisputeWrite = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.ADMIN, PRIVATE_AUTH_ROLES.OPS],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.OPS_DISPUTES_WRITE]
    });

    router.use(requireDisputeRead);

    router.get('/options', disputesController.options);
    router.get('/dashboard', disputesController.dashboard);
    router.get('/queue', validate(privateDisputeQuerySchema), disputesController.queue);
    router.get('/:disputeId', validate(privateDisputeParamsSchema), disputesController.detail);
    router.patch('/:disputeId', requireDisputeWrite, validate(updatePrivateDisputeStateSchema), disputesController.updateState);
    router.post('/:disputeId/assign', requireDisputeWrite, validate(assignPrivateDisputeSchema), disputesController.assign);
    router.post(
        '/:disputeId/request-evidence',
        requireDisputeWrite,
        validate(requestDisputeEvidenceSchema),
        disputesController.requestEvidence
    );
    router.post('/:disputeId/notes', requireDisputeWrite, validate(addPrivateDisputeNoteSchema), disputesController.addNote);
    router.post('/:disputeId/resolve', requireDisputeWrite, validate(resolvePrivateDisputeSchema), disputesController.resolve);
    router.post('/:disputeId/reject', requireDisputeWrite, validate(rejectPrivateDisputeSchema), disputesController.reject);

    return router;
};

export default createPrivateDisputesRouter();
