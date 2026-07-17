import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import {
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import { createPrivateAuthGuard } from '../auth/session/auth-guard.middleware.js';
import PrivateTokenService from '../auth/session/token.service.js';
import SurgeController from './surge.controller.js';
import SurgeDao from './surge.dao.js';
import SurgeService from './surge.service.js';
import {
    createSurgeRuleSchema,
    simulateSurgeSchema,
    surgeRuleParamsSchema,
    surgeRuleQuerySchema,
    updateSurgeRuleSchema
} from './validators/surge.validator.js';

const createSurgeDependencies = ({
    surgeDao = new SurgeDao(),
    tokenService = new PrivateTokenService(),
    now = () => new Date()
} = {}) => ({
    surgeDao,
    tokenService,
    now
});

export const createSurgeRouter = (dependencies = createSurgeDependencies()) => {
    const router = Router();
    const { surgeDao, tokenService, now } = dependencies;
    const surgeService = new SurgeService({ surgeDao, now });
    const surgeController = new SurgeController(surgeService);
    const requireSurgeRead = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.ADMIN, PRIVATE_AUTH_ROLES.OPS],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.PRICING_READ]
    });
    const requireSurgeWrite = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.ADMIN, PRIVATE_AUTH_ROLES.OPS],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.PRICING_WRITE]
    });

    router.use(requireSurgeRead);

    router.get('/options', surgeController.options);
    router.get('/dashboard', surgeController.dashboard);
    router.get('/rules', validate(surgeRuleQuerySchema), surgeController.listRules);
    router.post('/rules', requireSurgeWrite, validate(createSurgeRuleSchema), surgeController.createRule);
    router.post('/simulate', validate(simulateSurgeSchema), surgeController.simulate);
    router.get('/rules/:ruleId', validate(surgeRuleParamsSchema), surgeController.getRule);
    router.patch('/rules/:ruleId', requireSurgeWrite, validate(updateSurgeRuleSchema), surgeController.updateRule);
    router.post('/rules/:ruleId/activate', requireSurgeWrite, validate(surgeRuleParamsSchema), surgeController.activateRule);
    router.post('/rules/:ruleId/pause', requireSurgeWrite, validate(surgeRuleParamsSchema), surgeController.pauseRule);
    router.post('/rules/:ruleId/end', requireSurgeWrite, validate(surgeRuleParamsSchema), surgeController.endRule);
    router.post('/rules/:ruleId/archive', requireSurgeWrite, validate(surgeRuleParamsSchema), surgeController.archiveRule);

    return router;
};

export default createSurgeRouter();
