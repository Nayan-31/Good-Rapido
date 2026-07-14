import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import {
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import { createPrivateAuthGuard } from '../auth/session/auth-guard.middleware.js';
import PrivateTokenService from '../auth/session/token.service.js';
import TrustController from './trust.controller.js';
import TrustDao from './trust.dao.js';
import TrustService from './trust.service.js';
import {
    addTrustNoteSchema,
    assignTrustReviewerSchema,
    createTrustProfileSchema,
    resolveTrustReviewSchema,
    simulateTrustScoreSchema,
    trustProfileParamsSchema,
    trustProfileQuerySchema,
    updateTrustProfileSchema
} from './validators/trust.validator.js';

const createTrustDependencies = ({
    trustDao = new TrustDao(),
    tokenService = new PrivateTokenService(),
    now = () => new Date()
} = {}) => ({
    trustDao,
    tokenService,
    now
});

export const createTrustRouter = (dependencies = createTrustDependencies()) => {
    const router = Router();
    const { trustDao, tokenService, now } = dependencies;
    const trustService = new TrustService({ trustDao, now });
    const trustController = new TrustController(trustService);
    const requireTrustRead = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.ADMIN, PRIVATE_AUTH_ROLES.OPS],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.TRUST_READ]
    });
    const requireTrustWrite = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.ADMIN, PRIVATE_AUTH_ROLES.OPS],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.TRUST_WRITE]
    });

    router.use(requireTrustRead);

    router.get('/options', trustController.options);
    router.get('/dashboard', trustController.dashboard);
    router.get('/profiles', validate(trustProfileQuerySchema), trustController.listProfiles);
    router.post('/profiles', requireTrustWrite, validate(createTrustProfileSchema), trustController.createProfile);
    router.post('/simulate', validate(simulateTrustScoreSchema), trustController.simulate);
    router.get('/profiles/:profileId', validate(trustProfileParamsSchema), trustController.getProfile);
    router.patch('/profiles/:profileId', requireTrustWrite, validate(updateTrustProfileSchema), trustController.updateProfile);
    router.post(
        '/profiles/:profileId/assign',
        requireTrustWrite,
        validate(assignTrustReviewerSchema),
        trustController.assignReviewer
    );
    router.post(
        '/profiles/:profileId/notes',
        requireTrustWrite,
        validate(addTrustNoteSchema),
        trustController.addNote
    );
    router.post(
        '/profiles/:profileId/resolve',
        requireTrustWrite,
        validate(resolveTrustReviewSchema),
        trustController.resolveReview
    );

    return router;
};

export default createTrustRouter();
