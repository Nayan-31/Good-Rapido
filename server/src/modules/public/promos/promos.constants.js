export const PROMO_CURRENCY = 'INR';

export const PROMO_TYPES = Object.freeze({
    FIRST_RIDE: 'first_ride',
    FARE_SAVER: 'fare_saver',
    REFERRAL: 'referral',
    TRUST_REWARD: 'trust_reward'
});

export const PROMO_DISCOUNT_TYPES = Object.freeze({
    FLAT: 'flat',
    PERCENTAGE: 'percentage'
});

export const PROMO_APPLICATION_STATUSES = Object.freeze({
    APPLIED: 'applied',
    REJECTED: 'rejected',
    EXPIRED: 'expired'
});

export const PROMO_ABUSE_RISK_LEVELS = Object.freeze({
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
});

export const PROMO_DAILY_APPLICATION_LIMIT = 5;

export const PROMO_APPLICATION_LOCK_MINUTES = 15;

export const PROMO_CATALOG = Object.freeze([
    Object.freeze({
        code: 'GOODFIRST',
        title: 'First transparent ride',
        type: PROMO_TYPES.FIRST_RIDE,
        discountType: PROMO_DISCOUNT_TYPES.PERCENTAGE,
        discountValue: 50,
        maxDiscount: 75,
        minimumFare: 120,
        validFrom: '2026-01-01T00:00:00.000Z',
        validUntil: '2027-01-01T00:00:00.000Z',
        requiresFirstRide: true,
        requiresDeviceFingerprint: true,
        requiresReferralCode: false,
        description: 'Intro discount protected by device checks to prevent repeat first-ride abuse',
        terms: [
            'Only available before the first completed ride',
            'Device verification is required',
            'Discount is capped at INR 75'
        ]
    }),
    Object.freeze({
        code: 'FAIRFARE20',
        title: 'Fair fare saver',
        type: PROMO_TYPES.FARE_SAVER,
        discountType: PROMO_DISCOUNT_TYPES.PERCENTAGE,
        discountValue: 20,
        maxDiscount: 60,
        minimumFare: 180,
        validFrom: '2026-01-01T00:00:00.000Z',
        validUntil: '2027-01-01T00:00:00.000Z',
        requiresFirstRide: false,
        requiresDeviceFingerprint: false,
        requiresReferralCode: false,
        description: 'Percentage discount for regular rides with transparent cap and minimum fare',
        terms: [
            'Minimum fare INR 180',
            'Discount is capped at INR 60'
        ]
    }),
    Object.freeze({
        code: 'REFER50',
        title: 'Referral ride credit',
        type: PROMO_TYPES.REFERRAL,
        discountType: PROMO_DISCOUNT_TYPES.FLAT,
        discountValue: 50,
        maxDiscount: 50,
        minimumFare: 150,
        validFrom: '2026-01-01T00:00:00.000Z',
        validUntil: '2027-01-01T00:00:00.000Z',
        requiresFirstRide: false,
        requiresDeviceFingerprint: true,
        requiresReferralCode: true,
        description: 'Referral credit with device checks and referral code verification',
        terms: [
            'Referral code is required',
            'Device verification is required',
            'Minimum fare INR 150'
        ]
    }),
    Object.freeze({
        code: 'TRUSTRIDE',
        title: 'Trust ride reward',
        type: PROMO_TYPES.TRUST_REWARD,
        discountType: PROMO_DISCOUNT_TYPES.FLAT,
        discountValue: 40,
        maxDiscount: 40,
        minimumFare: 220,
        validFrom: '2026-01-01T00:00:00.000Z',
        validUntil: '2027-01-01T00:00:00.000Z',
        requiresFirstRide: false,
        requiresDeviceFingerprint: false,
        requiresReferralCode: false,
        description: 'Flat ride reward for higher-value trips',
        terms: [
            'Minimum fare INR 220',
            'One successful application per account'
        ]
    })
]);
