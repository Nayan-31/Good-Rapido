import AppError from '../../../../shared/utils/appError.js';

export const createAuthGuard = ({ tokenService, allowedRoles = [] }) => {
    return (req, _res, next) => {
        try {
            const accessToken = extractBearerToken(req.headers.authorization);
            const payload = tokenService.verifyAccessToken(accessToken);

            if (allowedRoles.length && !allowedRoles.includes(payload.role)) {
                throw AppError.forbidden('You do not have access to this route');
            }

            req.auth = {
                userId: payload.sub,
                role: payload.role
            };

            return next();
        } catch (err) {
            return next(err);
        }
    };
};

const extractBearerToken = (authorizationHeader) => {
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        throw AppError.unauthorized('Access token is required');
    }

    return authorizationHeader.replace('Bearer ', '').trim();
};


/**
 * This protects private routes like /me.
 * It checks:
 * Is there an Authorization header?
 * Is it Bearer token?
 * Is the access token valid?
 * Is the role allowed?
 */