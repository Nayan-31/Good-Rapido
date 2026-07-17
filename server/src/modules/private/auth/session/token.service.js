import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import env from '../../../../config/env.js';
import AppError from '../../../../shared/utils/appError.js';
import { PRIVATE_AUTH_TOKEN_SCOPE } from '../auth.constants.js';

export default class PrivateTokenService {
    createTokenPair(user) {
        return {
            accessToken: this.signAccessToken(user),
            refreshToken: this.signRefreshToken(user)
        };
    }

    signAccessToken(user) {
        return jwt.sign(
            {
                sub: this.getUserId(user),
                role: user.role,
                permissions: normalizePermissions(user.permissions),
                tokenType: 'access',
                tokenScope: PRIVATE_AUTH_TOKEN_SCOPE
            },
            env.ACCESS_SECRET_TOKEN,
            { expiresIn: env.ACCESS_TOKEN_EXPIRES_IN }
        );
    }

    signRefreshToken(user) {
        return jwt.sign(
            {
                sub: this.getUserId(user),
                role: user.role,
                tokenType: 'refresh',
                tokenScope: PRIVATE_AUTH_TOKEN_SCOPE
            },
            env.REFRESH_SECRET_TOKEN,
            { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN }
        );
    }

    verifyAccessToken(token) {
        const payload = jwt.verify(token, env.ACCESS_SECRET_TOKEN);

        if (payload.tokenType !== 'access' || payload.tokenScope !== PRIVATE_AUTH_TOKEN_SCOPE) {
            throw AppError.unauthorized('Invalid private access token');
        }

        return payload;
    }

    verifyRefreshToken(token) {
        const payload = jwt.verify(token, env.REFRESH_SECRET_TOKEN);

        if (payload.tokenType !== 'refresh' || payload.tokenScope !== PRIVATE_AUTH_TOKEN_SCOPE) {
            throw AppError.unauthorized('Invalid private refresh token');
        }

        return payload;
    }

    hashToken(token) {
        return createHash('sha256').update(token).digest('hex');
    }

    isTokenHashMatch(token, storedHash) {
        return this.hashToken(token) === storedHash;
    }

    getUserId(user) {
        return user.id || user._id?.toString();
    }
}

const normalizePermissions = (permissions = []) => Array.isArray(permissions) ? permissions : [];
