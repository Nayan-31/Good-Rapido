import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import {
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import { createPrivateAuthGuard } from '../auth/session/auth-guard.middleware.js';
import PrivateTokenService from '../auth/session/token.service.js';
import AnalyticsController from './analytics.controller.js';
import AnalyticsDao from './analytics.dao.js';
import AnalyticsService from './analytics.service.js';
import {
    analyticsBreakdownQuerySchema,
    analyticsDriverQuerySchema,
    analyticsForecastSchema,
    analyticsOverviewQuerySchema
} from './validators/analytics.validator.js';

const createAnalyticsDependencies = ({
    analyticsDao = new AnalyticsDao(),
    tokenService = new PrivateTokenService(),
    now = () => new Date()
} = {}) => ({
    analyticsDao,
    tokenService,
    now
});

export const createAnalyticsRouter = (dependencies = createAnalyticsDependencies()) => {
    const router = Router();
    const { analyticsDao, tokenService, now } = dependencies;
    const analyticsService = new AnalyticsService({ analyticsDao, now });
    const analyticsController = new AnalyticsController(analyticsService);
    const requireAnalyticsRead = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.ADMIN, PRIVATE_AUTH_ROLES.OPS],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.ANALYTICS_READ]
    });

    router.use(requireAnalyticsRead);

    router.get('/options', analyticsController.options);
    router.get('/overview', validate(analyticsOverviewQuerySchema), analyticsController.overview);
    router.get('/rides', validate(analyticsBreakdownQuerySchema), analyticsController.rides);
    router.get('/revenue', validate(analyticsBreakdownQuerySchema), analyticsController.revenue);
    router.get('/drivers', validate(analyticsDriverQuerySchema), analyticsController.drivers);
    router.get('/trust-safety', validate(analyticsOverviewQuerySchema), analyticsController.trustSafety);
    router.post('/forecast', validate(analyticsForecastSchema), analyticsController.forecast);

    return router;
};

export default createAnalyticsRouter();
