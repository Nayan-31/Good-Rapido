import { PROMO_CURRENCY } from '../promos.constants.js';

export const toPublicPromo = (promo, evaluation = {}) => ({
    code: promo.code,
    title: promo.title,
    type: promo.type,
    description: promo.description,
    discount: {
        type: promo.discountType,
        value: numberOrZero(promo.discountValue),
        maxDiscount: nullableNumber(promo.maxDiscount),
        currency: PROMO_CURRENCY,
        previewAmount: numberOrZero(evaluation.discountAmount)
    },
    minimumFare: numberOrZero(promo.minimumFare),
    validFrom: promo.validFrom,
    validUntil: promo.validUntil,
    requiredSignals: {
        firstRide: Boolean(promo.requiresFirstRide),
        deviceFingerprint: Boolean(promo.requiresDeviceFingerprint),
        referralCode: Boolean(promo.requiresReferralCode)
    },
    eligible: Boolean(evaluation.eligible),
    ineligibilityReasons: evaluation.reasons || [],
    abuseSignals: evaluation.abuseSignals || [],
    terms: promo.terms || []
});

export const toPublicReferralCode = (referral) => ({
    code: referral.code,
    currency: referral.currency || PROMO_CURRENCY,
    rewardAmount: numberOrZero(referral.rewardAmount),
    invitedRiderDiscount: numberOrZero(referral.invitedRiderDiscount),
    shareText: referral.shareText,
    fraudNote: referral.fraudNote
});

export const toPublicPromoApplication = (application) => {
    const applicationObject = application?.toObject ? application.toObject() : application;

    return {
        id: getId(applicationObject),
        applicationCode: applicationObject.applicationCode,
        promoCode: applicationObject.promoCode,
        rideId: applicationObject.rideId || null,
        referralCode: applicationObject.referralCode || null,
        status: applicationObject.status,
        currency: applicationObject.currency || PROMO_CURRENCY,
        fareAmount: numberOrZero(applicationObject.fareAmount),
        discountAmount: numberOrZero(applicationObject.discountAmount),
        finalAmount: numberOrZero(applicationObject.finalAmount),
        eligibility: {
            rideCount: numberOrZero(applicationObject.eligibilitySnapshot?.rideCount),
            discountType: applicationObject.eligibilitySnapshot?.discountType || null,
            discountValue: numberOrZero(applicationObject.eligibilitySnapshot?.discountValue),
            maxDiscount: nullableNumber(applicationObject.eligibilitySnapshot?.maxDiscount),
            minimumFare: numberOrZero(applicationObject.eligibilitySnapshot?.minimumFare),
            ineligibilityReasons: applicationObject.eligibilitySnapshot?.ineligibilityReasons || [],
            abuseSignals: applicationObject.eligibilitySnapshot?.abuseSignals || []
        },
        appliedAt: applicationObject.appliedAt || null,
        expiresAt: applicationObject.expiresAt || null,
        createdAt: applicationObject.createdAt || null,
        updatedAt: applicationObject.updatedAt || null
    };
};

export const toPublicPromoHistoryItem = (application) => {
    const applicationObject = application?.toObject ? application.toObject() : application;

    return {
        id: getId(applicationObject),
        applicationCode: applicationObject.applicationCode,
        promoCode: applicationObject.promoCode,
        rideId: applicationObject.rideId || null,
        status: applicationObject.status,
        currency: applicationObject.currency || PROMO_CURRENCY,
        fareAmount: numberOrZero(applicationObject.fareAmount),
        discountAmount: numberOrZero(applicationObject.discountAmount),
        finalAmount: numberOrZero(applicationObject.finalAmount),
        appliedAt: applicationObject.appliedAt || null,
        expiresAt: applicationObject.expiresAt || null
    };
};

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;

const nullableNumber = (value) => Number.isFinite(value) ? value : null;
