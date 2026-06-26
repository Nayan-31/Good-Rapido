import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import env from '../../../../config/env.js';
import AppError from '../../../../shared/utils/appError.js';

export default class TokenService {
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
                tokenType: 'access'
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
                tokenType: 'refresh'
            },
            env.REFRESH_SECRET_TOKEN,
            { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN }
        );
    }

    verifyAccessToken(token) {
        const payload = jwt.verify(token, env.ACCESS_SECRET_TOKEN);

        if (payload.tokenType !== 'access') {
            throw AppError.unauthorized('Invalid access token');
        }

        return payload;
    }

    verifyRefreshToken(token) {
        const payload = jwt.verify(token, env.REFRESH_SECRET_TOKEN);

        if (payload.tokenType !== 'refresh') {
            throw AppError.unauthorized('Invalid refresh token');
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
