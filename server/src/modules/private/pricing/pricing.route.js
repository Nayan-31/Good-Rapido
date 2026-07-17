import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import {
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import { createPrivateAuthGuard } from '../auth/session/auth-guard.middleware.js';
import PrivateTokenService from '../auth/session/token.service.js';
import PricingController from './pricing.controller.js';
import PricingDao from './pricing.dao.js';
import PricingService from './pricing.service.js';
import {
    createPricingRuleSchema,
    pricingRuleParamsSchema,
    pricingRuleQuerySchema,
    simulatePricingSchema,
    updatePricingRuleSchema
} from './validators/pricing.validator.js';

const createPricingDependencies = ({
    pricingDao = new PricingDao(),
    tokenService = new PrivateTokenService(),
    now = () => new Date()
} = {}) => ({
    pricingDao,
    tokenService,
    now
});

export const createPricingRouter = (dependencies = createPricingDependencies()) => {
    const router = Router();
    const { pricingDao, tokenService, now } = dependencies;
    const pricingService = new PricingService({ pricingDao, now });
    const pricingController = new PricingController(pricingService);
    const requirePricingRead = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.ADMIN, PRIVATE_AUTH_ROLES.OPS],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.PRICING_READ]
    });
    const requirePricingWrite = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.ADMIN, PRIVATE_AUTH_ROLES.OPS],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.PRICING_WRITE]
    });

    router.use(requirePricingRead);

    router.get('/options', pricingController.options);
    router.get('/dashboard', pricingController.dashboard);
    router.get('/rules', validate(pricingRuleQuerySchema), pricingController.listRules);
    router.post('/rules', requirePricingWrite, validate(createPricingRuleSchema), pricingController.createRule);
    router.post('/simulate', validate(simulatePricingSchema), pricingController.simulate);
    router.get('/rules/:ruleId', validate(pricingRuleParamsSchema), pricingController.getRule);
    router.patch('/rules/:ruleId', requirePricingWrite, validate(updatePricingRuleSchema), pricingController.updateRule);
    router.post('/rules/:ruleId/activate', requirePricingWrite, validate(pricingRuleParamsSchema), pricingController.activateRule);
    router.post('/rules/:ruleId/archive', requirePricingWrite, validate(pricingRuleParamsSchema), pricingController.archiveRule);

    return router;
};

export default createPricingRouter();
