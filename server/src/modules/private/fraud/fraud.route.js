import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import {
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import { createPrivateAuthGuard } from '../auth/session/auth-guard.middleware.js';
import PrivateTokenService from '../auth/session/token.service.js';
import FraudController from './fraud.controller.js';
import FraudDao from './fraud.dao.js';
import FraudService from './fraud.service.js';
import {
    addFraudNoteSchema,
    assignFraudReviewerSchema,
    confirmFraudCaseSchema,
    createFraudCaseSchema,
    dismissFraudCaseSchema,
    fraudCaseParamsSchema,
    fraudCaseQuerySchema,
    resolveFraudCaseSchema,
    simulateFraudScoreSchema,
    updateFraudCaseSchema
} from './validators/fraud.validator.js';

const createFraudDependencies = ({
    fraudDao = new FraudDao(),
    tokenService = new PrivateTokenService(),
    now = () => new Date()
} = {}) => ({
    fraudDao,
    tokenService,
    now
});

export const createFraudRouter = (dependencies = createFraudDependencies()) => {
    const router = Router();
    const { fraudDao, tokenService, now } = dependencies;
    const fraudService = new FraudService({ fraudDao, now });
    const fraudController = new FraudController(fraudService);
    const requireFraudRead = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.ADMIN, PRIVATE_AUTH_ROLES.OPS],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.FRAUD_READ]
    });
    const requireFraudWrite = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.ADMIN, PRIVATE_AUTH_ROLES.OPS],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.FRAUD_WRITE]
    });

    router.use(requireFraudRead);

    router.get('/options', fraudController.options);
    router.get('/dashboard', fraudController.dashboard);
    router.get('/cases', validate(fraudCaseQuerySchema), fraudController.listCases);
    router.post('/cases', requireFraudWrite, validate(createFraudCaseSchema), fraudController.createCase);
    router.post('/simulate', validate(simulateFraudScoreSchema), fraudController.simulate);
    router.get('/cases/:caseId', validate(fraudCaseParamsSchema), fraudController.getCase);
    router.patch('/cases/:caseId', requireFraudWrite, validate(updateFraudCaseSchema), fraudController.updateCase);
    router.post(
        '/cases/:caseId/assign',
        requireFraudWrite,
        validate(assignFraudReviewerSchema),
        fraudController.assignReviewer
    );
    router.post(
        '/cases/:caseId/notes',
        requireFraudWrite,
        validate(addFraudNoteSchema),
        fraudController.addNote
    );
    router.post(
        '/cases/:caseId/confirm',
        requireFraudWrite,
        validate(confirmFraudCaseSchema),
        fraudController.confirmCase
    );
    router.post(
        '/cases/:caseId/dismiss',
        requireFraudWrite,
        validate(dismissFraudCaseSchema),
        fraudController.dismissCase
    );
    router.post(
        '/cases/:caseId/resolve',
        requireFraudWrite,
        validate(resolveFraudCaseSchema),
        fraudController.resolveCase
    );

    return router;
};

export default createFraudRouter();
