import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import TokenService from '../auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import { createProfileRouter } from './profile.route.js';

const BASE_PATH = '/api/v1/public/profile';

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createProfileRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createUser = (role = AUTH_ROLES.RIDER) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role
});

const createProfile = (role = AUTH_ROLES.RIDER, overrides = {}) => ({
    id: `${role}-profile-id`,
    _id: `${role}-profile-id`,
    authUserId: `${role}-id`,
    role,
    displayName: `${role} User`,
    avatarUrl: null,
    dateOfBirth: null,
    gender: null,
    savedAddresses: [],
    emergencyContacts: [],
    preferences: {
        language: 'en',
        notifications: {
            sms: true,
            email: true,
            push: true
        }
    },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides
});

const createDependencies = () => ({
    profileDao: {
        create: jest.fn(),
        findByAuthUserIdAndRole: jest.fn(),
        updateProfile: jest.fn(),
        updatePreferences: jest.fn(),
        addSavedAddress: jest.fn(),
        updateSavedAddress: jest.fn(),
        removeSavedAddress: jest.fn(),
        addEmergencyContact: jest.fn(),
        updateEmergencyContact: jest.fn(),
        removeEmergencyContact: jest.fn()
    },
    tokenService: new TokenService()
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('public profile routes', () => {
    let dependencies;
    let app;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
    });

    test('me creates a profile when the authenticated user does not have one yet', async () => {
        const user = createUser();
        const profile = createProfile(user.role);

        dependencies.profileDao.findByAuthUserIdAndRole.mockResolvedValue(null);
        dependencies.profileDao.create.mockResolvedValue(profile);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/me`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.profile.role).toBe(user.role);
        expect(dependencies.profileDao.create).toHaveBeenCalledWith({
            authUserId: user.id,
            role: user.role
        });
    });

    test('update me changes editable profile fields', async () => {
        const user = createUser(AUTH_ROLES.PASSENGER);
        const profile = createProfile(user.role);
        const updatedProfile = createProfile(user.role, {
            displayName: 'Updated Passenger'
        });

        dependencies.profileDao.findByAuthUserIdAndRole.mockResolvedValue(profile);
        dependencies.profileDao.updateProfile.mockResolvedValue(updatedProfile);

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/me`,
            headers: authHeaderFor(dependencies, user),
            body: {
                displayName: 'Updated Passenger'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.profile.displayName).toBe('Updated Passenger');
        expect(dependencies.profileDao.updateProfile).toHaveBeenCalledWith(user.id, user.role, {
            displayName: 'Updated Passenger'
        });
    });

    test('preferences can be updated independently', async () => {
        const user = createUser();
        const profile = createProfile(user.role);
        const updatedProfile = createProfile(user.role, {
            preferences: {
                language: 'hi',
                notifications: {
                    sms: true,
                    email: false,
                    push: true
                }
            }
        });

        dependencies.profileDao.findByAuthUserIdAndRole.mockResolvedValue(profile);
        dependencies.profileDao.updatePreferences.mockResolvedValue(updatedProfile);

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/preferences`,
            headers: authHeaderFor(dependencies, user),
            body: {
                language: 'hi',
                notifications: {
                    email: false
                }
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.profile.preferences.language).toBe('hi');
        expect(response.body.data.profile.preferences.notifications.email).toBe(false);
        expect(dependencies.profileDao.updatePreferences).toHaveBeenCalledWith(user.id, user.role, {
            language: 'hi',
            notifications: {
                email: false
            }
        });
    });

    test('saved addresses can be added', async () => {
        const user = createUser();
        const profile = createProfile(user.role);
        const updatedProfile = createProfile(user.role, {
            savedAddresses: [{
                id: 'address-id',
                label: 'Home',
                addressLine: '221B Baker Street',
                city: 'Kolkata',
                isDefault: true
            }]
        });

        dependencies.profileDao.findByAuthUserIdAndRole.mockResolvedValue(profile);
        dependencies.profileDao.addSavedAddress.mockResolvedValue(updatedProfile);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/saved-addresses`,
            headers: authHeaderFor(dependencies, user),
            body: {
                label: 'Home',
                addressLine: '221B Baker Street',
                city: 'Kolkata',
                isDefault: true
            }
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.data.profile.savedAddresses[0].label).toBe('Home');
        expect(dependencies.profileDao.addSavedAddress).toHaveBeenCalledWith(user.id, user.role, {
            label: 'Home',
            addressLine: '221B Baker Street',
            city: 'Kolkata',
            isDefault: true
        });
    });

    test('emergency contacts can be added', async () => {
        const user = createUser();
        const profile = createProfile(user.role);
        const updatedProfile = createProfile(user.role, {
            emergencyContacts: [{
                id: 'contact-id',
                name: 'Emergency Person',
                phone: '+919876543210',
                relationship: 'Friend'
            }]
        });

        dependencies.profileDao.findByAuthUserIdAndRole.mockResolvedValue(profile);
        dependencies.profileDao.addEmergencyContact.mockResolvedValue(updatedProfile);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/emergency-contacts`,
            headers: authHeaderFor(dependencies, user),
            body: {
                name: 'Emergency Person',
                phone: '+919876543210',
                relationship: 'Friend'
            }
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.data.profile.emergencyContacts[0].phone).toBe('+919876543210');
    });

    test('saved address updates return not found when address does not exist', async () => {
        const user = createUser();
        const profile = createProfile(user.role);

        dependencies.profileDao.findByAuthUserIdAndRole.mockResolvedValue(profile);
        dependencies.profileDao.updateSavedAddress.mockResolvedValue(null);

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/saved-addresses/missing-address-id`,
            headers: authHeaderFor(dependencies, user),
            body: {
                label: 'Office'
            }
        });

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Saved address not found');
    });

    test('profile routes reject requests without an access token', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/me`
        });

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Access token is required');
    });

    test('profile routes return validation errors for invalid payloads', async () => {
        const user = createUser();

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/saved-addresses`,
            headers: authHeaderFor(dependencies, user),
            body: {
                label: 'H'
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors.length).toBeGreaterThan(0);
    });

    test('unknown profile routes return 404', async () => {
        const user = createUser();

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/unknown`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
    });
});
