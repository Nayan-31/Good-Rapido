import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import { toPublicProfile } from './dto/profile.dto.js';

export default class ProfileService {
    constructor({ dao }) {
        this.dao = dao;
    }

    async me(authContext) {
        const profile = await this.ensureProfile(authContext);

        return buildSuccessResponse({
            message: 'Profile fetched successfully',
            data: {
                profile: toPublicProfile(profile)
            }
        });
    }

    async updateMe(authContext, payload) {
        const { userId, role } = this.assertAuthContext(authContext);

        await this.ensureProfile(authContext);

        const profile = await this.dao.updateProfile(userId, role, this.normalizeProfilePayload(payload));

        return buildSuccessResponse({
            message: 'Profile updated successfully',
            data: {
                profile: toPublicProfile(profile)
            }
        });
    }

    async updatePreferences(authContext, payload) {
        const { userId, role } = this.assertAuthContext(authContext);

        await this.ensureProfile(authContext);

        const profile = await this.dao.updatePreferences(userId, role, payload);

        return buildSuccessResponse({
            message: 'Profile preferences updated successfully',
            data: {
                profile: toPublicProfile(profile)
            }
        });
    }

    async addSavedAddress(authContext, payload) {
        const { userId, role } = this.assertAuthContext(authContext);

        await this.ensureProfile(authContext);

        const profile = await this.dao.addSavedAddress(userId, role, payload);

        return buildSuccessResponse({
            statusCode: 201,
            message: 'Saved address added successfully',
            data: {
                profile: toPublicProfile(profile)
            }
        });
    }

    async updateSavedAddress(authContext, addressId, payload) {
        const { userId, role } = this.assertAuthContext(authContext);

        await this.ensureProfile(authContext);

        const profile = await this.dao.updateSavedAddress(userId, role, addressId, payload);

        if (!profile) {
            throw AppError.notFound('Saved address not found');
        }

        return buildSuccessResponse({
            message: 'Saved address updated successfully',
            data: {
                profile: toPublicProfile(profile)
            }
        });
    }

    async removeSavedAddress(authContext, addressId) {
        const { userId, role } = this.assertAuthContext(authContext);

        await this.ensureProfile(authContext);

        const profile = await this.dao.removeSavedAddress(userId, role, addressId);

        if (!profile) {
            throw AppError.notFound('Saved address not found');
        }

        return buildSuccessResponse({
            message: 'Saved address removed successfully',
            data: {
                profile: toPublicProfile(profile)
            }
        });
    }

    async addEmergencyContact(authContext, payload) {
        const { userId, role } = this.assertAuthContext(authContext);

        await this.ensureProfile(authContext);

        const profile = await this.dao.addEmergencyContact(userId, role, payload);

        return buildSuccessResponse({
            statusCode: 201,
            message: 'Emergency contact added successfully',
            data: {
                profile: toPublicProfile(profile)
            }
        });
    }

    async updateEmergencyContact(authContext, contactId, payload) {
        const { userId, role } = this.assertAuthContext(authContext);

        await this.ensureProfile(authContext);

        const profile = await this.dao.updateEmergencyContact(userId, role, contactId, payload);

        if (!profile) {
            throw AppError.notFound('Emergency contact not found');
        }

        return buildSuccessResponse({
            message: 'Emergency contact updated successfully',
            data: {
                profile: toPublicProfile(profile)
            }
        });
    }

    async removeEmergencyContact(authContext, contactId) {
        const { userId, role } = this.assertAuthContext(authContext);

        await this.ensureProfile(authContext);

        const profile = await this.dao.removeEmergencyContact(userId, role, contactId);

        if (!profile) {
            throw AppError.notFound('Emergency contact not found');
        }

        return buildSuccessResponse({
            message: 'Emergency contact removed successfully',
            data: {
                profile: toPublicProfile(profile)
            }
        });
    }

    async ensureProfile(authContext) {
        const { userId, role } = this.assertAuthContext(authContext);
        const profile = await this.dao.findByAuthUserIdAndRole(userId, role);

        if (profile) {
            return profile;
        }

        return this.dao.create({
            authUserId: userId,
            role
        });
    }

    normalizeProfilePayload(payload) {
        const normalizedPayload = { ...payload };

        if (payload.dateOfBirth) {
            normalizedPayload.dateOfBirth = new Date(payload.dateOfBirth);
        }

        return normalizedPayload;
    }

    assertAuthContext(authContext) {
        if (!authContext?.userId || !authContext?.role) {
            throw AppError.unauthorized();
        }

        return authContext;
    }
}
