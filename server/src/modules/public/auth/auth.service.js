import { AUTH_ACCOUNT_STATUSES, AUTH_ROLE_LABELS } from './auth.constants.js';
import { toAuthSessionDto, toPublicAuthUser } from './dto/auth.dto.js';
import { AUTH_IDENTIFIER_FIELDS } from './interfaces/auth.interface.js';
import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';

const SECRET_PROJECTION = '+passwordHash +refreshTokenHash';

export default class AuthService {
    constructor({ role, dao, passwordService, tokenService }) {
        this.role = role;
        this.dao = dao;
        this.passwordService = passwordService;
        this.tokenService = tokenService;
        this.roleLabel = AUTH_ROLE_LABELS[role];
    }

    async register(payload) {
        const registrationPayload = this.normalizeRegistrationPayload(payload);
        const existingUser = await this.dao.findExistingContact(this.role, registrationPayload);

        if (existingUser) {
            throw AppError.conflict(`${this.roleLabel} account already exists with this phone or email`);
        }

        const passwordHash = await this.passwordService.hash(registrationPayload.password);
        const user = await this.dao.create({
            role: this.role,
            fullName: registrationPayload.fullName,
            email: registrationPayload.email,
            phone: registrationPayload.phone,
            passwordHash
        });
        const tokens = await this.createSession(user);

        return buildSuccessResponse({
            statusCode: 201,
            message: `${this.roleLabel} registered successfully`,
            data: toAuthSessionDto(user, tokens)
        });
    }

    async login(payload) {
        const identifier = this.normalizeIdentifier(payload.identifier);
        const user = await this.dao.findByIdentifier(this.role, identifier, SECRET_PROJECTION);

        if (!user) {
            throw AppError.unauthorized(`Invalid ${this.roleLabel.toLowerCase()} credentials`);
        }

        this.assertActiveAccount(user);

        const isPasswordValid = await this.passwordService.compare(payload.password, user.passwordHash);

        if (!isPasswordValid) {
            throw AppError.unauthorized(`Invalid ${this.roleLabel.toLowerCase()} credentials`);
        }

        const tokens = await this.createSession(user);

        return buildSuccessResponse({
            message: `${this.roleLabel} logged in successfully`,
            data: toAuthSessionDto(user, tokens)
        });
    }

    async refresh(payload = {}, cookies = {}) {
        const refreshToken = payload.refreshToken || cookies.refreshToken;

        if (!refreshToken) {
            throw AppError.unauthorized('Refresh token is required');
        }

        const tokenPayload = this.tokenService.verifyRefreshToken(refreshToken);
        this.assertTokenRole(tokenPayload.role);

        const user = await this.dao.findByIdAndRole(tokenPayload.sub, this.role, SECRET_PROJECTION);

        if (!user || !user.refreshTokenHash) {
            throw AppError.unauthorized('Invalid refresh token');
        }

        this.assertActiveAccount(user);

        if (!this.tokenService.isTokenHashMatch(refreshToken, user.refreshTokenHash)) {
            throw AppError.unauthorized('Invalid refresh token');
        }

        const tokens = await this.createSession(user);

        return buildSuccessResponse({
            message: `${this.roleLabel} session refreshed successfully`,
            data: toAuthSessionDto(user, tokens)
        });
    }

    async logout(payload = {}, cookies = {}) {
        const refreshToken = payload.refreshToken || cookies.refreshToken;

        if (!refreshToken) {
            throw AppError.unauthorized('Refresh token is required');
        }

        const tokenPayload = this.tokenService.verifyRefreshToken(refreshToken);
        this.assertTokenRole(tokenPayload.role);

        const user = await this.dao.findByIdAndRole(tokenPayload.sub, this.role, SECRET_PROJECTION);

        if (!user || !user.refreshTokenHash) {
            throw AppError.unauthorized('Invalid refresh token');
        }

        if (!this.tokenService.isTokenHashMatch(refreshToken, user.refreshTokenHash)) {
            throw AppError.unauthorized('Invalid refresh token');
        }

        await this.dao.clearSession(tokenPayload.sub, this.role);

        return buildSuccessResponse({
            message: `${this.roleLabel} logged out successfully`
        });
    }

    async me(authContext) {
        if (!authContext?.userId) {
            throw AppError.unauthorized();
        }

        this.assertTokenRole(authContext.role);

        const user = await this.dao.findByIdAndRole(authContext.userId, this.role);

        if (!user) {
            throw AppError.notFound(`${this.roleLabel} account not found`);
        }

        this.assertActiveAccount(user);

        return buildSuccessResponse({
            message: `${this.roleLabel} profile fetched successfully`,
            data: {
                user: toPublicAuthUser(user)
            }
        });
    }

    async createSession(user) {
        const tokens = this.tokenService.createTokenPair(user);
        const refreshTokenHash = this.tokenService.hashToken(tokens.refreshToken);

        await this.dao.updateSession(this.tokenService.getUserId(user), this.role, refreshTokenHash);

        return tokens;
    }

    normalizeRegistrationPayload(payload) {
        return {
            fullName: payload.fullName.trim(),
            email: payload.email ? payload.email.trim().toLowerCase() : undefined,
            phone: payload.phone.trim(),
            password: payload.password
        };
    }

    normalizeIdentifier(identifier) {
        const value = identifier.trim();

        if (value.includes('@')) {
            return { [AUTH_IDENTIFIER_FIELDS.EMAIL]: value.toLowerCase() };
        }

        return { [AUTH_IDENTIFIER_FIELDS.PHONE]: value };
    }

    assertActiveAccount(user) {
        if (user.accountStatus !== AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`${this.roleLabel} account is ${user.accountStatus}`);
        }
    }

    assertTokenRole(role) {
        if (role !== this.role) {
            throw AppError.forbidden(`Token is not valid for ${this.roleLabel.toLowerCase()} routes`);
        }
    }
}


/**
 * auth.service.js  = business rules
 */