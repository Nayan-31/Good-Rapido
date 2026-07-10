import { toPrivateAuthUser } from '../../auth/dto/auth.dto.js';
import {
    DRIVER_APPROVAL_STATUSES,
    DRIVER_CONTACT_CHANNELS,
    DRIVER_ONBOARDING_STATUSES,
    DRIVER_ONBOARDING_STEP_CATALOG,
    DRIVER_ONBOARDING_STEP_STATUSES,
    DRIVER_VEHICLE_TYPES
} from '../driver.constants.js';

export const toDriverOptions = () => ({
    onboardingStatuses: Object.values(DRIVER_ONBOARDING_STATUSES),
    approvalStatuses: Object.values(DRIVER_APPROVAL_STATUSES),
    stepStatuses: Object.values(DRIVER_ONBOARDING_STEP_STATUSES),
    onboardingSteps: DRIVER_ONBOARDING_STEP_CATALOG,
    vehicleTypes: Object.values(DRIVER_VEHICLE_TYPES),
    contactChannels: Object.values(DRIVER_CONTACT_CHANNELS)
});

export const toDriverProfile = (authUser = {}, driverProfile = {}) => ({
    auth: toPrivateAuthUser(authUser),
    driver: toDriverProfileSnapshot(driverProfile),
    guidance: toDriverGuidance(driverProfile)
});

export const toDriverProfileSnapshot = (driverProfile = {}) => ({
    id: getId(driverProfile),
    authUserId: getAuthUserId(driverProfile),
    driverCode: driverProfile.driverCode || null,
    profile: toPublicProfile(driverProfile.profile),
    service: toServiceProfile(driverProfile.service),
    onboarding: toDriverOnboarding(driverProfile),
    approvalStatus: driverProfile.approvalStatus || DRIVER_APPROVAL_STATUSES.PENDING,
    accountControls: toDriverAccountControls(driverProfile.accountControls),
    latestActivityAt: driverProfile.latestActivityAt || null,
    createdAt: driverProfile.createdAt || null,
    updatedAt: driverProfile.updatedAt || null
});

export const toDriverOnboarding = (driverProfile = {}) => {
    const onboarding = driverProfile.onboarding || {};

    return {
        status: onboarding.status || DRIVER_ONBOARDING_STATUSES.NOT_STARTED,
        steps: normalizeSteps(onboarding.steps),
        submittedAt: onboarding.submittedAt || null,
        reviewedAt: onboarding.reviewedAt || null,
        rejectionReason: onboarding.rejectionReason || null,
        completion: toOnboardingCompletion(onboarding.steps)
    };
};

export const toDriverAccount = (authUser = {}, driverProfile = {}) => ({
    auth: toPrivateAuthUser(authUser),
    approvalStatus: driverProfile.approvalStatus || DRIVER_APPROVAL_STATUSES.PENDING,
    onboardingStatus: driverProfile.onboarding?.status || DRIVER_ONBOARDING_STATUSES.NOT_STARTED,
    accountControls: toDriverAccountControls(driverProfile.accountControls),
    guidance: toDriverAccountGuidance(driverProfile)
});

export const toDriverGuidance = (driverProfile = {}) => ({
    canEditProfile: canEditProfile(driverProfile),
    canSubmitOnboarding: canSubmitOnboarding(driverProfile),
    canEnableRideRequests: canEnableRideRequests(driverProfile),
    nextAction: resolveNextAction(driverProfile)
});

const toPublicProfile = (profile = {}) => ({
    displayName: profile?.displayName || null,
    bio: profile?.bio || null,
    profilePhotoUrl: profile?.profilePhotoUrl || null,
    languages: Array.isArray(profile?.languages) ? profile.languages : []
});

const toServiceProfile = (service = {}) => ({
    serviceZone: service?.serviceZone || null,
    vehicleTypes: Array.isArray(service?.vehicleTypes) ? service.vehicleTypes : [],
    experienceYears: nullableNumber(service?.experienceYears),
    preferredRadiusKm: nullableNumber(service?.preferredRadiusKm)
});

const toDriverAccountControls = (controls = {}) => ({
    rideRequestsEnabled: controls?.rideRequestsEnabled === true,
    marketingOptIn: controls?.marketingOptIn !== false,
    safetyTrainingAccepted: controls?.safetyTrainingAccepted === true,
    preferredContactChannel: controls?.preferredContactChannel || DRIVER_CONTACT_CHANNELS.IN_APP,
    deactivationRequestedAt: controls?.deactivationRequestedAt || null,
    deactivationReason: controls?.deactivationReason || null
});

const toDriverAccountGuidance = (driverProfile = {}) => ({
    canReceiveRideRequests: canEnableRideRequests(driverProfile),
    requiresOnboardingReview: driverProfile.approvalStatus === DRIVER_APPROVAL_STATUSES.UNDER_REVIEW,
    requiresOnboardingCompletion: !isRequiredOnboardingComplete(driverProfile.onboarding?.steps),
    deactivationRequested: Boolean(driverProfile.accountControls?.deactivationRequestedAt)
});

const normalizeSteps = (steps = []) => {
    const existingSteps = Array.isArray(steps) ? steps : [];

    return DRIVER_ONBOARDING_STEP_CATALOG.map((catalogStep) => {
        const step = existingSteps.find((item) => item.key === catalogStep.key) || {};

        return {
            key: catalogStep.key,
            label: step.label || catalogStep.label,
            required: step.required !== false,
            status: step.status || DRIVER_ONBOARDING_STEP_STATUSES.PENDING,
            note: step.note || null,
            completedAt: step.completedAt || null,
            updatedAt: step.updatedAt || null
        };
    });
};

const toOnboardingCompletion = (steps = []) => {
    const normalizedSteps = normalizeSteps(steps);
    const requiredSteps = normalizedSteps.filter((step) => step.required);
    const completedRequiredSteps = requiredSteps.filter((step) => step.status === DRIVER_ONBOARDING_STEP_STATUSES.COMPLETED);

    return {
        requiredSteps: requiredSteps.length,
        completedRequiredSteps: completedRequiredSteps.length,
        percent: requiredSteps.length
            ? Math.round((completedRequiredSteps.length / requiredSteps.length) * 100)
            : 100
    };
};

const canEditProfile = (driverProfile = {}) => ![
    DRIVER_ONBOARDING_STATUSES.SUBMITTED,
    DRIVER_ONBOARDING_STATUSES.APPROVED
].includes(driverProfile.onboarding?.status);

const canSubmitOnboarding = (driverProfile = {}) => {
    return isRequiredOnboardingComplete(driverProfile.onboarding?.steps)
        && ![
            DRIVER_ONBOARDING_STATUSES.SUBMITTED,
            DRIVER_ONBOARDING_STATUSES.APPROVED
        ].includes(driverProfile.onboarding?.status);
};

const canEnableRideRequests = (driverProfile = {}) => {
    return driverProfile.approvalStatus === DRIVER_APPROVAL_STATUSES.APPROVED
        && driverProfile.onboarding?.status === DRIVER_ONBOARDING_STATUSES.APPROVED
        && !driverProfile.accountControls?.deactivationRequestedAt;
};

const isRequiredOnboardingComplete = (steps = []) => {
    return normalizeSteps(steps)
        .filter((step) => step.required)
        .every((step) => step.status === DRIVER_ONBOARDING_STEP_STATUSES.COMPLETED);
};

const resolveNextAction = (driverProfile = {}) => {
    if (driverProfile.accountControls?.deactivationRequestedAt) {
        return 'Wait for support to process the deactivation request';
    }

    if (driverProfile.approvalStatus === DRIVER_APPROVAL_STATUSES.REJECTED) {
        return 'Review rejection notes and update onboarding details';
    }

    if (driverProfile.approvalStatus === DRIVER_APPROVAL_STATUSES.UNDER_REVIEW) {
        return 'Wait for onboarding review';
    }

    if (!isRequiredOnboardingComplete(driverProfile.onboarding?.steps)) {
        return 'Complete required onboarding steps';
    }

    if (canSubmitOnboarding(driverProfile)) {
        return 'Submit onboarding for review';
    }

    if (canEnableRideRequests(driverProfile)) {
        return 'Enable ride requests when ready';
    }

    return 'No action required';
};

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const getAuthUserId = (document = {}) => document.authUserId?._id?.toString?.()
    || document.authUserId?.toString?.()
    || document.authUserId
    || null;

const nullableNumber = (value) => Number.isFinite(value) ? value : null;
