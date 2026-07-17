import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import AppError from '../../../shared/utils/appError.js';
import { AUTH_ROLES } from '../../public/auth/auth.constants.js';
import PublicTokenService from '../../public/auth/session/token.service.js';
import {
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../../private/auth/auth.constants.js';
import { createPrivateAuthGuard } from '../../private/auth/session/auth-guard.middleware.js';
import PrivateTokenService from '../../private/auth/session/token.service.js';
import { IDENTITY_SCOPES } from './identity.constants.js';
import IdentityController from './identity.controller.js';
import IdentityDao from './identity.dao.js';
import IdentityService from './identity.service.js';
import {
    identityParamsSchema,
    identityReviewQueueSchema,
    reviewIdentitySchema,
    upsertIdentitySchema
} from './validators/identity.validator.js';

const createIdentityDependencies = ({
    identityDao = new IdentityDao(),
    publicTokenService = new PublicTokenService(),
    privateTokenService = new PrivateTokenService(),
    now = () => new Date()
} = {}) => ({
    identityDao,
    publicTokenService,
    privateTokenService,
    now
});

export const createIdentityRouter = (dependencies = createIdentityDependencies()) => {
    const router = Router();
    const {
        identityDao,
        publicTokenService,
        privateTokenService,
        now
    } = dependencies;
    const identityService = new IdentityService({ identityDao, now });
    const identityController = new IdentityController(identityService);
    const requireIdentityAccess = createCoreIdentityAuthGuard({
        publicTokenService,
        privateTokenService,
        allowedRoles: [
            ...Object.values(AUTH_ROLES),
            PRIVATE_AUTH_ROLES.DRIVER,
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ]
    });
    const requireIdentityReviewRead = createPrivateAuthGuard({
        tokenService: privateTokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.ADMIN, PRIVATE_AUTH_ROLES.OPS],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.TRUST_READ]
    });
    const requireIdentityReviewWrite = createPrivateAuthGuard({
        tokenService: privateTokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.ADMIN, PRIVATE_AUTH_ROLES.OPS],
        requiredPermissions: [
            PRIVATE_AUTH_PERMISSIONS.TRUST_READ,
            PRIVATE_AUTH_PERMISSIONS.TRUST_WRITE
        ]
    });

    router.get('/options', requireIdentityAccess, identityController.options);
    router.get('/me', requireIdentityAccess, identityController.me);
    router.put('/me', requireIdentityAccess, validate(upsertIdentitySchema), identityController.upsertMe);
    router.post('/me/submit', requireIdentityAccess, identityController.submitMe);
    router.get(
        '/review-queue',
        requireIdentityReviewRead,
        markPrivateIdentityScope,
        validate(identityReviewQueueSchema),
        identityController.getReviewQueue
    );
    router.get(
        '/verifications/:identityId',
        requireIdentityReviewRead,
        markPrivateIdentityScope,
        validate(identityParamsSchema),
        identityController.getIdentity
    );
    router.patch(
        '/verifications/:identityId/review',
        requireIdentityReviewWrite,
        markPrivateIdentityScope,
        validate(reviewIdentitySchema),
        identityController.reviewIdentity
    );

    return router;
};

const createCoreIdentityAuthGuard = ({
    publicTokenService,
    privateTokenService,
    allowedRoles = []
}) => {
    return (req, _res, next) => {
        try {
            const accessToken = extractBearerToken(req.headers.authorization);
            const authContext = verifyCoreIdentityAccess({
                accessToken,
                publicTokenService,
                privateTokenService
            });

            if (allowedRoles.length && !allowedRoles.includes(authContext.role)) {
                throw AppError.forbidden('You do not have access to identity routes');
            }

            req.auth = authContext;

            return next();
        } catch (err) {
            return next(err);
        }
    };
};

const verifyCoreIdentityAccess = ({
    accessToken,
    publicTokenService,
    privateTokenService
}) => {
    try {
        const payload = privateTokenService.verifyAccessToken(accessToken);

        return {
            userId: payload.sub,
            role: payload.role,
            permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
            scope: IDENTITY_SCOPES.PRIVATE
        };
    } catch (_privateErr) {
        const payload = publicTokenService.verifyAccessToken(accessToken);

        return {
            userId: payload.sub,
            role: payload.role,
            permissions: [],
            scope: IDENTITY_SCOPES.PUBLIC
        };
    }
};

const extractBearerToken = (authorizationHeader) => {
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        throw AppError.unauthorized('Access token is required');
    }

    return authorizationHeader.replace('Bearer ', '').trim();
};

const markPrivateIdentityScope = (req, _res, next) => {
    req.auth = {
        ...req.auth,
        scope: IDENTITY_SCOPES.PRIVATE
    };

    return next();
};

export default createIdentityRouter();
