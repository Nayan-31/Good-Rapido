import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import {
    DRIVER_APPROVAL_STATUSES,
    DRIVER_CONTACT_CHANNELS,
    DRIVER_DEFAULT_PREFERRED_RADIUS_KM,
    DRIVER_ONBOARDING_STATUSES,
    DRIVER_ONBOARDING_STEP_CATALOG,
    DRIVER_ONBOARDING_STEP_STATUSES
} from './driver.constants.js';
import {
    toDriverAccount,
    toDriverGuidance,
    toDriverOnboarding,
    toDriverOptions,
    toDriverProfile,
    toDriverProfileSnapshot
} from './dto/driver.dto.js';

export default class DriverService {
    constructor({ driverDao, now = () => new Date() }) {
        this.driverDao = driverDao;
        this.now = now;
    }

    options(authContext) {
        this.assertDriverReadContext(authContext);

        return buildSuccessResponse({
            message: 'Driver options fetched successfully',
            data: {
                options: toDriverOptions()
            }
        });
    }

    async getProfile(authContext) {
        const { authUser, driverProfile } = await this.getDriverContext(authContext);

        return buildSuccessResponse({
            message: 'Driver profile fetched successfully',
            data: {
                profile: toDriverProfile(authUser, driverProfile)
            }
        });
    }

    async updateProfile(authContext, payload) {
        this.assertDriverWriteContext(authContext);
        const { authUser, driverProfile } = await this.getDriverContext(authContext);
        const updatedProfile = await this.updateDriverProfile(authContext.userId, {
            ...this.buildProfileUpdatePayload(driverProfile, payload),
            latestActivityAt: this.now()
        });

        return buildSuccessResponse({
            message: 'Driver profile updated successfully',
            data: {
                profile: toDriverProfile(authUser, updatedProfile)
            }
        });
    }

    async getOnboarding(authContext) {
        const { driverProfile } = await this.getDriverContext(authContext);

        return buildSuccessResponse({
            message: 'Driver onboarding fetched successfully',
            data: {
                onboarding: toDriverOnboarding(driverProfile),
                approvalStatus: driverProfile.approvalStatus,
                guidance: toDriverGuidance(driverProfile)
            }
        });
    }

    async updateOnboarding(authContext, payload) {
        this.assertDriverWriteContext(authContext);
        const { driverProfile } = await this.getDriverContext(authContext);

        if ([
            DRIVER_ONBOARDING_STATUSES.SUBMITTED,
            DRIVER_ONBOARDING_STATUSES.APPROVED
        ].includes(driverProfile.onboarding?.status)) {
            throw AppError.badRequest('Submitted or approved onboarding cannot be edited');
        }

        const updatedProfile = await this.updateDriverProfile(authContext.userId, {
            onboarding: {
                ...driverProfile.onboarding,
                status: DRIVER_ONBOARDING_STATUSES.IN_PROGRESS,
                steps: mergeOnboardingSteps(driverProfile.onboarding?.steps, payload.steps, this.now()),
                rejectionReason: null,
                reviewedAt: null
            },
            latestActivityAt: this.now()
        });

        return buildSuccessResponse({
            message: 'Driver onboarding updated successfully',
            data: {
                onboarding: toDriverOnboarding(updatedProfile),
                approvalStatus: updatedProfile.approvalStatus,
                guidance: toDriverGuidance(updatedProfile)
            }
        });
    }

    async submitOnboarding(authContext) {
        this.assertDriverWriteContext(authContext);
        const { driverProfile } = await this.getDriverContext(authContext);

        if ([
            DRIVER_ONBOARDING_STATUSES.SUBMITTED,
            DRIVER_ONBOARDING_STATUSES.APPROVED
        ].includes(driverProfile.onboarding?.status)) {
            throw AppError.badRequest('Onboarding is already submitted or approved');
        }

        if (!isRequiredOnboardingComplete(driverProfile.onboarding?.steps)) {
            throw AppError.badRequest('Complete all required onboarding steps before submitting');
        }

        const submittedAt = this.now();
        const updatedProfile = await this.updateDriverProfile(authContext.userId, {
            onboarding: {
                ...driverProfile.onboarding,
                status: DRIVER_ONBOARDING_STATUSES.SUBMITTED,
                submittedAt,
                reviewedAt: null,
                rejectionReason: null
            },
            approvalStatus: DRIVER_APPROVAL_STATUSES.UNDER_REVIEW,
            latestActivityAt: submittedAt
        });

        return buildSuccessResponse({
            message: 'Driver onboarding submitted successfully',
            data: {
                onboarding: toDriverOnboarding(updatedProfile),
                approvalStatus: updatedProfile.approvalStatus,
                guidance: toDriverGuidance(updatedProfile)
            }
        });
    }

    async getAccount(authContext) {
        const { authUser, driverProfile } = await this.getDriverContext(authContext);

        return buildSuccessResponse({
            message: 'Driver account fetched successfully',
            data: {
                account: toDriverAccount(authUser, driverProfile)
            }
        });
    }

    async updateAccountControls(authContext, payload) {
        this.assertDriverWriteContext(authContext);
        const { authUser, driverProfile } = await this.getDriverContext(authContext);

        if (payload.rideRequestsEnabled === true && !canEnableRideRequests(driverProfile)) {
            throw AppError.badRequest('Driver must be approved before enabling ride requests');
        }

        const updatedProfile = await this.updateDriverProfile(authContext.userId, {
            accountControls: {
                ...driverProfile.accountControls,
                ...normalizeAccountControls(payload)
            },
            latestActivityAt: this.now()
        });

        return buildSuccessResponse({
            message: 'Driver account controls updated successfully',
            data: {
                account: toDriverAccount(authUser, updatedProfile)
            }
        });
    }

    async requestDeactivation(authContext, payload = {}) {
        this.assertDriverWriteContext(authContext);
        const { authUser, driverProfile } = await this.getDriverContext(authContext);
        const requestedAt = this.now();
        const updatedProfile = await this.updateDriverProfile(authContext.userId, {
            accountControls: {
                ...driverProfile.accountControls,
                rideRequestsEnabled: false,
                deactivationRequestedAt: requestedAt,
                deactivationReason: payload.reason?.trim() || null
            },
            latestActivityAt: requestedAt
        });

        return buildSuccessResponse({
            message: 'Driver deactivation request submitted successfully',
            data: {
                account: toDriverAccount(authUser, updatedProfile)
            }
        });
    }

    async getDriverContext(authContext) {
        this.assertDriverReadContext(authContext);
        const authUser = toPlainObject(await this.driverDao.findAuthUserById(authContext.userId));

        if (!authUser) {
            throw AppError.notFound('Driver account not found');
        }

        this.assertActiveDriver(authUser);

        const driverProfile = await this.ensureDriverProfile(authUser);

        return {
            authUser,
            driverProfile
        };
    }

    async ensureDriverProfile(authUser) {
        const existingProfile = toPlainObject(await this.driverDao.findProfileByAuthUserId(getId(authUser)));

        if (existingProfile) {
            return normalizeDriverProfile(existingProfile);
        }

        const now = this.now();
        const profile = await this.driverDao.createProfile({
            authUserId: getId(authUser),
            driverCode: authUser.employeeCode || createDriverCode(now),
            profile: {
                displayName: authUser.fullName
            },
            service: {
                serviceZone: authUser.serviceZone || null,
                vehicleTypes: [],
                preferredRadiusKm: DRIVER_DEFAULT_PREFERRED_RADIUS_KM
            },
            onboarding: {
                status: DRIVER_ONBOARDING_STATUSES.NOT_STARTED,
                steps: defaultOnboardingSteps()
            },
            approvalStatus: DRIVER_APPROVAL_STATUSES.PENDING,
            accountControls: defaultAccountControls(),
            latestActivityAt: now
        });

        return normalizeDriverProfile(toPlainObject(profile));
    }

    async updateDriverProfile(authUserId, payload) {
        const updatedProfile = await this.driverDao.updateProfile(authUserId, payload);

        if (!updatedProfile) {
            throw AppError.notFound('Driver profile not found');
        }

        return normalizeDriverProfile(toPlainObject(updatedProfile));
    }

    buildProfileUpdatePayload(driverProfile, payload) {
        const updatePayload = {};

        if (payload.profile) {
            updatePayload.profile = {
                ...driverProfile.profile,
                ...normalizePublicProfile(payload.profile)
            };
        }

        if (payload.service) {
            updatePayload.service = {
                ...driverProfile.service,
                ...normalizeServiceProfile(payload.service)
            };
        }

        if (driverProfile.onboarding?.status === DRIVER_ONBOARDING_STATUSES.NOT_STARTED) {
            updatePayload.onboarding = {
                ...driverProfile.onboarding,
                status: DRIVER_ONBOARDING_STATUSES.IN_PROGRESS
            };
        }

        return updatePayload;
    }

    assertDriverReadContext(authContext) {
        if (!authContext?.userId || authContext.role !== PRIVATE_AUTH_ROLES.DRIVER) {
            throw AppError.forbidden('Driver private access is required');
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.DRIVER_PROFILE_READ)) {
            throw AppError.forbidden('Driver profile read permission is required');
        }

        return authContext;
    }

    assertDriverWriteContext(authContext) {
        this.assertDriverReadContext(authContext);

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.DRIVER_PROFILE_WRITE)) {
            throw AppError.forbidden('Driver profile write permission is required');
        }
    }

    assertActiveDriver(authUser) {
        if (authUser.accountStatus !== PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`Driver account is ${authUser.accountStatus}`);
        }
    }
}

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const defaultOnboardingSteps = () => DRIVER_ONBOARDING_STEP_CATALOG.map((step) => ({
    ...step,
    status: DRIVER_ONBOARDING_STEP_STATUSES.PENDING,
    note: null,
    completedAt: null,
    updatedAt: null
}));

const defaultAccountControls = () => ({
    rideRequestsEnabled: false,
    marketingOptIn: true,
    safetyTrainingAccepted: false,
    preferredContactChannel: DRIVER_CONTACT_CHANNELS.IN_APP,
    deactivationRequestedAt: null,
    deactivationReason: null
});

const normalizeDriverProfile = (profile = {}) => ({
    ...profile,
    profile: {
        displayName: profile.profile?.displayName || null,
        bio: profile.profile?.bio || null,
        profilePhotoUrl: profile.profile?.profilePhotoUrl || null,
        languages: Array.isArray(profile.profile?.languages) ? profile.profile.languages : []
    },
    service: {
        serviceZone: profile.service?.serviceZone || null,
        vehicleTypes: Array.isArray(profile.service?.vehicleTypes) ? profile.service.vehicleTypes : [],
        experienceYears: profile.service?.experienceYears,
        preferredRadiusKm: profile.service?.preferredRadiusKm || DRIVER_DEFAULT_PREFERRED_RADIUS_KM
    },
    onboarding: {
        status: profile.onboarding?.status || DRIVER_ONBOARDING_STATUSES.NOT_STARTED,
        steps: mergeOnboardingSteps(profile.onboarding?.steps, []),
        submittedAt: profile.onboarding?.submittedAt || null,
        reviewedAt: profile.onboarding?.reviewedAt || null,
        rejectionReason: profile.onboarding?.rejectionReason || null
    },
    approvalStatus: profile.approvalStatus || DRIVER_APPROVAL_STATUSES.PENDING,
    accountControls: {
        ...defaultAccountControls(),
        ...(profile.accountControls || {})
    }
});

const normalizePublicProfile = (profile = {}) => ({
    ...(profile.displayName !== undefined ? { displayName: profile.displayName.trim() } : {}),
    ...(profile.bio !== undefined ? { bio: profile.bio?.trim() || null } : {}),
    ...(profile.profilePhotoUrl !== undefined ? { profilePhotoUrl: profile.profilePhotoUrl?.trim() || null } : {}),
    ...(profile.languages !== undefined ? { languages: uniqueStrings(profile.languages) } : {})
});

const normalizeServiceProfile = (service = {}) => ({
    ...(service.serviceZone !== undefined ? { serviceZone: service.serviceZone?.trim() || null } : {}),
    ...(service.vehicleTypes !== undefined ? { vehicleTypes: [...new Set(service.vehicleTypes)] } : {}),
    ...(service.experienceYears !== undefined ? { experienceYears: service.experienceYears } : {}),
    ...(service.preferredRadiusKm !== undefined ? { preferredRadiusKm: service.preferredRadiusKm } : {})
});

const normalizeAccountControls = (controls = {}) => ({
    ...(controls.rideRequestsEnabled !== undefined ? { rideRequestsEnabled: controls.rideRequestsEnabled } : {}),
    ...(controls.marketingOptIn !== undefined ? { marketingOptIn: controls.marketingOptIn } : {}),
    ...(controls.safetyTrainingAccepted !== undefined ? { safetyTrainingAccepted: controls.safetyTrainingAccepted } : {}),
    ...(controls.preferredContactChannel !== undefined ? { preferredContactChannel: controls.preferredContactChannel } : {})
});

const mergeOnboardingSteps = (existingSteps = [], incomingSteps = [], updatedAt = null) => {
    const existingByKey = new Map((Array.isArray(existingSteps) ? existingSteps : []).map((step) => [step.key, step]));
    const incomingByKey = new Map((Array.isArray(incomingSteps) ? incomingSteps : []).map((step) => [step.key, step]));

    return DRIVER_ONBOARDING_STEP_CATALOG.map((catalogStep) => {
        const existingStep = existingByKey.get(catalogStep.key) || {};
        const incomingStep = incomingByKey.get(catalogStep.key) || {};
        const status = incomingStep.status || existingStep.status || DRIVER_ONBOARDING_STEP_STATUSES.PENDING;

        return {
            key: catalogStep.key,
            label: existingStep.label || catalogStep.label,
            required: existingStep.required !== false,
            status,
            note: incomingStep.note !== undefined ? incomingStep.note?.trim() || null : existingStep.note || null,
            completedAt: status === DRIVER_ONBOARDING_STEP_STATUSES.COMPLETED
                ? incomingStep.completedAt || existingStep.completedAt || updatedAt
                : null,
            updatedAt: incomingStep.status || incomingStep.note !== undefined ? updatedAt : existingStep.updatedAt || null
        };
    });
};

const isRequiredOnboardingComplete = (steps = []) => {
    return mergeOnboardingSteps(steps, [])
        .filter((step) => step.required)
        .every((step) => step.status === DRIVER_ONBOARDING_STEP_STATUSES.COMPLETED);
};

const canEnableRideRequests = (driverProfile = {}) => {
    return driverProfile.approvalStatus === DRIVER_APPROVAL_STATUSES.APPROVED
        && driverProfile.onboarding?.status === DRIVER_ONBOARDING_STATUSES.APPROVED
        && !driverProfile.accountControls?.deactivationRequestedAt;
};

const createDriverCode = (date) => {
    const compactTimestamp = date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();

    return `DRV-${compactTimestamp}-${randomSuffix}`;
};

const uniqueStrings = (items = []) => [...new Set(items.map((item) => item.trim()).filter(Boolean))];
