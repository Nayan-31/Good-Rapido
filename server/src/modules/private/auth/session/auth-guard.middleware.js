import AppError from '../../../../shared/utils/appError.js';

export const createPrivateAuthGuard = ({
    tokenService,
    allowedRoles = [],
    requiredPermissions = []
}) => {
    return (req, _res, next) => {
        try {
            const accessToken = extractBearerToken(req.headers.authorization);
            const payload = tokenService.verifyAccessToken(accessToken);

            if (allowedRoles.length && !allowedRoles.includes(payload.role)) {
                throw AppError.forbidden('You do not have access to this private route');
            }

            const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];

            if (!hasRequiredPermissions(permissions, requiredPermissions)) {
                throw AppError.forbidden('Required private permission is missing');
            }

            req.auth = {
                userId: payload.sub,
                role: payload.role,
                permissions
            };

            return next();
        } catch (err) {
            return next(err);
        }
    };
};

const extractBearerToken = (authorizationHeader) => {
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        throw AppError.unauthorized('Private access token is required');
    }

    return authorizationHeader.replace('Bearer ', '').trim();
};

const hasRequiredPermissions = (permissions, requiredPermissions) => {
    if (!requiredPermissions.length) {
        return true;
    }

    return requiredPermissions.every((permission) => permissions.includes(permission));
};
