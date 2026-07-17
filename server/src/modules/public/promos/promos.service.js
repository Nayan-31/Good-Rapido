import { createHash } from 'crypto';
import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    PROMO_ABUSE_RISK_LEVELS,
    PROMO_APPLICATION_LOCK_MINUTES,
    PROMO_APPLICATION_STATUSES,
    PROMO_CATALOG,
    PROMO_CURRENCY,
    PROMO_DAILY_APPLICATION_LIMIT,
    PROMO_DISCOUNT_TYPES
} from './promos.constants.js';
import {
    toPublicPromo,
    toPublicPromoApplication,
    toPublicPromoHistoryItem,
    toPublicReferralCode
} from './dto/promos.dto.js';

export default class PromosService {
    constructor({ promosDao, now = () => new Date() }) {
        this.promosDao = promosDao;
        this.now = now;
    }

    async eligible(authContext, query = {}) {
        const { userId, role } = this.assertAuthContext(authContext);
        const normalizedQuery = this.normalizePromoInput(query);
        const evaluations = PROMO_CATALOG.map((promo) => ({
            promo,
            evaluation: this.evaluatePromo(promo, normalizedQuery)
        }));
        const eligiblePromos = evaluations.filter(({ evaluation }) => evaluation.eligible);

        return buildSuccessResponse({
            message: 'Promo eligibility fetched successfully',
            data: {
                promos: evaluations.map(({ promo, evaluation }) => toPublicPromo(promo, evaluation)),
                summary: {
                    eligibleCount: eligiblePromos.length,
                    currency: PROMO_CURRENCY,
                    fareAmount: normalizedQuery.fareAmount,
                    bestDiscountAmount: eligiblePromos.length
                        ? Math.max(...eligiblePromos.map(({ evaluation }) => evaluation.discountAmount))
                        : 0,
                    appliedFilters: {
                        rideCount: normalizedQuery.rideCount,
                        city: normalizedQuery.city || null,
                        hasDeviceFingerprint: Boolean(normalizedQuery.deviceFingerprint),
                        hasReferralCode: Boolean(normalizedQuery.referralCode)
                    }
                },
                referral: toPublicReferralCode(this.buildReferral(userId, role))
            }
        });
    }

    async referralCode(authContext) {
        const { userId, role } = this.assertAuthContext(authContext);

        return buildSuccessResponse({
            message: 'Referral code fetched successfully',
            data: {
                referral: toPublicReferralCode(this.buildReferral(userId, role))
            }
        });
    }

    async history(authContext, query = {}) {
        const { userId, role } = this.assertAuthContext(authContext);
        const applications = await this.promosDao.findRecentForUser(userId, role, query);
        const applicationObjects = applications.map(toPlainObject);

        return buildSuccessResponse({
            message: 'Promo history fetched successfully',
            data: {
                history: applicationObjects.map(toPublicPromoHistoryItem),
                summary: {
                    resultCount: applicationObjects.length,
                    totalSavings: roundMoney(applicationObjects
                        .filter((application) => application.status === PROMO_APPLICATION_STATUSES.APPLIED)
                        .reduce((sum, application) => sum + (application.discountAmount || 0), 0)),
                    filters: {
                        status: query.status || null
                    }
                }
            }
        });
    }

    async apply(authContext, payload) {
        const { userId, role } = this.assertAuthContext(authContext);
        const normalizedPayload = this.normalizePromoInput(payload);
        const promo = this.findPromo(normalizedPayload.promoCode);

        if (!promo) {
            throw AppError.notFound('Promo code not found');
        }

        const startOfToday = startOfDay(this.now());
        const applicationCount = await this.promosDao.countApplicationsForUserSince(userId, role, startOfToday);

        if (applicationCount >= PROMO_DAILY_APPLICATION_LIMIT) {
            throw AppError.badRequest('Daily promo application limit reached');
        }

        const alreadyApplied = await this.promosDao.findAppliedCodeForUser(userId, role, promo.code);

        if (alreadyApplied) {
            throw AppError.conflict('Promo code has already been applied by this account');
        }

        const deviceFingerprintHash = normalizedPayload.deviceFingerprint
            ? hashValue(normalizedPayload.deviceFingerprint)
            : null;

        if (promo.requiresDeviceFingerprint && !deviceFingerprintHash) {
            throw AppError.badRequest('Device fingerprint is required for this promo');
        }

        if (promo.requiresDeviceFingerprint) {
            const existingDeviceApplication = await this.promosDao.findAppliedForDeviceFingerprintHash(
                deviceFingerprintHash,
                promo.code
            );

            if (existingDeviceApplication) {
                throw AppError.conflict('Promo code has already been used on this device');
            }
        }

        const evaluation = this.evaluatePromo(promo, normalizedPayload);

        if (!evaluation.eligible) {
            throw AppError.badRequest('Promo is not eligible for this ride', evaluation.reasons.map((reason) => ({
                path: 'body.promoCode',
                message: reason
            })));
        }

        const application = await this.promosDao.create({
            applicationCode: createPromoApplicationCode(this.now()),
            authUserId: userId,
            role,
            promoCode: promo.code,
            rideId: normalizedPayload.rideId,
            referralCode: normalizedPayload.referralCode,
            deviceFingerprintHash,
            status: PROMO_APPLICATION_STATUSES.APPLIED,
            currency: PROMO_CURRENCY,
            fareAmount: normalizedPayload.fareAmount,
            discountAmount: evaluation.discountAmount,
            finalAmount: evaluation.finalAmount,
            eligibilitySnapshot: this.buildEligibilitySnapshot(promo, normalizedPayload, evaluation),
            appliedAt: this.now(),
            expiresAt: addMinutes(this.now(), PROMO_APPLICATION_LOCK_MINUTES)
        });

        return buildSuccessResponse({
            statusCode: 201,
            message: 'Promo applied successfully',
            data: {
                promoApplication: toPublicPromoApplication(application),
                savings: {
                    currency: PROMO_CURRENCY,
                    fareAmount: normalizedPayload.fareAmount,
                    discountAmount: evaluation.discountAmount,
                    finalAmount: evaluation.finalAmount
                }
            }
        });
    }

    findPromo(promoCode) {
        return PROMO_CATALOG.find((promo) => promo.code === promoCode);
    }

    normalizePromoInput(input = {}) {
        return {
            ...input,
            promoCode: input.promoCode?.trim?.().toUpperCase?.() || input.promoCode,
            referralCode: input.referralCode?.trim?.().toUpperCase?.() || input.referralCode,
            city: input.city?.trim?.() || input.city,
            rideCount: Number(input.rideCount || 0),
            fareAmount: roundMoney(Number(input.fareAmount || 0))
        };
    }

    evaluatePromo(promo, input) {
        const now = this.now();
        const reasons = [];
        const abuseSignals = this.buildAbuseSignals(promo);

        if (new Date(promo.validFrom) > now) {
            reasons.push('Promo is not active yet');
        }

        if (new Date(promo.validUntil) < now) {
            reasons.push('Promo has expired');
        }

        if (input.fareAmount < promo.minimumFare) {
            reasons.push(`Minimum fare of ${PROMO_CURRENCY} ${promo.minimumFare} is required`);
        }

        if (promo.requiresFirstRide && input.rideCount > 0) {
            reasons.push('Promo is only available before the first completed ride');
        }

        if (promo.requiresDeviceFingerprint && !input.deviceFingerprint) {
            reasons.push('Device fingerprint is required for this promo');
        }

        if (promo.requiresReferralCode && !input.referralCode) {
            reasons.push('Referral code is required for this promo');
        }

        const eligible = reasons.length === 0;
        const discountAmount = eligible ? this.calculateDiscount(promo, input.fareAmount) : 0;

        return {
            eligible,
            reasons,
            abuseSignals,
            discountAmount,
            finalAmount: roundMoney(Math.max(0, input.fareAmount - discountAmount))
        };
    }

    calculateDiscount(promo, fareAmount) {
        if (promo.discountType === PROMO_DISCOUNT_TYPES.PERCENTAGE) {
            return roundMoney(Math.min((fareAmount * promo.discountValue) / 100, promo.maxDiscount));
        }

        return roundMoney(Math.min(promo.discountValue, fareAmount, promo.maxDiscount));
    }

    buildEligibilitySnapshot(promo, input, evaluation) {
        return {
            rideCount: input.rideCount,
            discountType: promo.discountType,
            discountValue: promo.discountValue,
            maxDiscount: promo.maxDiscount,
            minimumFare: promo.minimumFare,
            ineligibilityReasons: evaluation.reasons,
            abuseSignals: evaluation.abuseSignals
        };
    }

    buildAbuseSignals(promo) {
        const signals = [];

        if (promo.requiresDeviceFingerprint) {
            signals.push({
                code: 'device_fingerprint_required',
                level: PROMO_ABUSE_RISK_LEVELS.MEDIUM,
                message: 'Device fingerprint helps prevent repeated promo use through multiple accounts'
            });
        }

        if (promo.requiresFirstRide) {
            signals.push({
                code: 'first_ride_only',
                level: PROMO_ABUSE_RISK_LEVELS.HIGH,
                message: 'First-ride promo is blocked once a completed ride is detected'
            });
        }

        if (promo.requiresReferralCode) {
            signals.push({
                code: 'referral_code_required',
                level: PROMO_ABUSE_RISK_LEVELS.LOW,
                message: 'Referral code is required before referral credit can be used'
            });
        }

        return signals;
    }

    buildReferral(userId, role) {
        const referralCode = `GR${role.slice(0, 1).toUpperCase()}${hashValue(`${role}:${userId}`).slice(0, 8).toUpperCase()}`;

        return {
            code: referralCode,
            currency: PROMO_CURRENCY,
            rewardAmount: 50,
            invitedRiderDiscount: 50,
            shareText: `Use ${referralCode} to get INR 50 off your first Good Rapido ride`,
            fraudNote: 'Referral rewards are released after account, device, and ride-completion checks'
        };
    }

    assertAuthContext(authContext) {
        if (!authContext?.userId || !authContext?.role) {
            throw AppError.unauthorized();
        }

        return authContext;
    }
}

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const roundMoney = (value) => Number((value || 0).toFixed(2));

const hashValue = (value) => createHash('sha256').update(String(value)).digest('hex');

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const createPromoApplicationCode = (date) => `PROMO-GR-${date.getTime()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
