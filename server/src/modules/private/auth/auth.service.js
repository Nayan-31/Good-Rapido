import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_ROLE_LABELS
} from './auth.constants.js';
import { toPrivateAuthSessionDto, toPrivateAuthUser } from './dto/auth.dto.js';
import { PRIVATE_AUTH_IDENTIFIER_FIELDS } from './interfaces/auth.interface.js';

const SECRET_PROJECTION = '+passwordHash +refreshTokenHash';

export default class PrivateAuthService {
    constructor({
        role,
        dao,
        passwordService,
        tokenService,
        allowRegistration = false
    }) {
        this.role = role;
        this.dao = dao;
        this.passwordService = passwordService;
        this.tokenService = tokenService;
        this.allowRegistration = allowRegistration;
        this.roleLabel = PRIVATE_AUTH_ROLE_LABELS[role];
    }

    async register(payload) {
        if (!this.allowRegistration) {
            throw AppError.forbidden(`${this.roleLabel} self-registration is not available`);
        }

        const registrationPayload = this.normalizeRegistrationPayload(payload);
        const existingUser = await this.dao.findExistingContact(this.role, registrationPayload);

        if (existingUser) {
            throw AppError.conflict(`${this.roleLabel} account already exists with this contact`);
        }

        const passwordHash = await this.passwordService.hash(registrationPayload.password);
        let user;

        try {
            user = await this.dao.create({
                role: this.role,
                fullName: registrationPayload.fullName,
                email: registrationPayload.email,
                phone: registrationPayload.phone,
                employeeCode: registrationPayload.employeeCode,
                department: registrationPayload.department,
                serviceZone: registrationPayload.serviceZone,
                permissions: this.defaultPermissions(),
                passwordHash
            });
        } catch (err) {
            if (err.code === 11000) {
                throw AppError.conflict(`${this.roleLabel} account already exists with this contact`);
            }

            throw err;
        }

        const sessionUser = this.withResolvedPermissions(user);
        const tokens = await this.createSession(sessionUser);

        return buildSuccessResponse({
            statusCode: 201,
            message: `${this.roleLabel} registered successfully`,
            data: toPrivateAuthSessionDto(sessionUser, tokens)
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

        const sessionUser = this.withResolvedPermissions(user);
        const tokens = await this.createSession(sessionUser);

        return buildSuccessResponse({
            message: `${this.roleLabel} logged in successfully`,
            data: toPrivateAuthSessionDto(sessionUser, tokens)
        });
    }

    async refresh(payload = {}, cookies = {}) {
        const refreshToken = payload.refreshToken || cookies.refreshToken;

        if (!refreshToken) {
            throw AppError.unauthorized('Private refresh token is required');
        }

        const tokenPayload = this.tokenService.verifyRefreshToken(refreshToken);
        this.assertTokenRole(tokenPayload.role);

        const user = await this.dao.findByIdAndRole(tokenPayload.sub, this.role, SECRET_PROJECTION);

        if (!user || !user.refreshTokenHash) {
            throw AppError.unauthorized('Invalid private refresh token');
        }

        this.assertActiveAccount(user);

        if (!this.tokenService.isTokenHashMatch(refreshToken, user.refreshTokenHash)) {
            throw AppError.unauthorized('Invalid private refresh token');
        }

        const sessionUser = this.withResolvedPermissions(user);
        const tokens = await this.createSession(sessionUser);

        return buildSuccessResponse({
            message: `${this.roleLabel} session refreshed successfully`,
            data: toPrivateAuthSessionDto(sessionUser, tokens)
        });
    }

    async logout(payload = {}, cookies = {}) {
        const refreshToken = payload.refreshToken || cookies.refreshToken;

        if (!refreshToken) {
            throw AppError.unauthorized('Private refresh token is required');
        }

        const tokenPayload = this.tokenService.verifyRefreshToken(refreshToken);
        this.assertTokenRole(tokenPayload.role);

        const user = await this.dao.findByIdAndRole(tokenPayload.sub, this.role, SECRET_PROJECTION);

        if (!user || !user.refreshTokenHash) {
            throw AppError.unauthorized('Invalid private refresh token');
        }

        if (!this.tokenService.isTokenHashMatch(refreshToken, user.refreshTokenHash)) {
            throw AppError.unauthorized('Invalid private refresh token');
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
                user: toPrivateAuthUser(this.withResolvedPermissions(user))
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
            employeeCode: payload.employeeCode ? payload.employeeCode.trim().toUpperCase() : undefined,
            department: payload.department?.trim() || undefined,
            serviceZone: payload.serviceZone?.trim() || undefined,
            password: payload.password
        };
    }

    normalizeIdentifier(identifier) {
        const value = identifier.trim();

        if (value.includes('@')) {
            return { [PRIVATE_AUTH_IDENTIFIER_FIELDS.EMAIL]: value.toLowerCase() };
        }

        if (/^\+?[1-9]\d{7,14}$/.test(value)) {
            return { [PRIVATE_AUTH_IDENTIFIER_FIELDS.PHONE]: value };
        }

        return { [PRIVATE_AUTH_IDENTIFIER_FIELDS.EMPLOYEE_CODE]: value.toUpperCase() };
    }

    assertActiveAccount(user) {
        if (user.accountStatus !== PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`${this.roleLabel} account is ${user.accountStatus}`);
        }
    }

    assertTokenRole(role) {
        if (role !== this.role) {
            throw AppError.forbidden(`Token is not valid for ${this.roleLabel.toLowerCase()} routes`);
        }
    }

    withResolvedPermissions(user) {
        const userObject = toPlainObject(user);

        return {
            ...userObject,
            permissions: Array.isArray(userObject.permissions) && userObject.permissions.length
                ? userObject.permissions
                : this.defaultPermissions()
        };
    }

    defaultPermissions() {
        return [...(DEFAULT_PRIVATE_ROLE_PERMISSIONS[this.role] || [])];
    }
}

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;
