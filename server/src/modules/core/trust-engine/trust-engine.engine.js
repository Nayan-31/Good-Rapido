import { RIDE_BOOKING_RISK_LEVELS } from '../../public/ride-booking/ride-booking.constants.js';
import {
    TRUST_PROFILE_STATUSES,
    TRUST_REVIEW_STATUSES,
    TRUST_RISK_LEVELS,
    TRUST_SCORE_DEFAULT,
    TRUST_SUBJECT_TYPES
} from '../../private/trust/trust.constants.js';
import {
    TRUST_ENGINE_ASSESSMENT_SOURCES,
    TRUST_ENGINE_DEFAULT_DRIVER_SIGNAL_SCORE,
    TRUST_ENGINE_DRIVER_TRUST_LEVELS,
    TRUST_ENGINE_ROUTE_FAIRNESS_LEVELS
} from './trust-engine.constants.js';

export const buildTrustAssessment = ({
    scores,
    metrics,
    subjectType = TRUST_SUBJECT_TYPES.RIDER,
    riskLevel,
    status,
    reviewStatus
} = {}) => {
    const normalizedMetrics = normalizeTrustMetrics(metrics);
    const normalizedScores = normalizeTrustScores(scores, normalizedMetrics);
    const normalizedRiskLevel = riskLevel || resolveTrustRiskLevel(normalizedScores.overall);
    const normalizedStatus = status || resolveTrustProfileStatus(normalizedRiskLevel);
    const normalizedReviewStatus = reviewStatus || resolveTrustReviewStatus(normalizedRiskLevel);

    return {
        source: scores ? TRUST_ENGINE_ASSESSMENT_SOURCES.MANUAL_SCORES : TRUST_ENGINE_ASSESSMENT_SOURCES.METRICS,
        subjectType,
        scores: normalizedScores,
        metrics: normalizedMetrics,
        riskLevel: normalizedRiskLevel,
        status: normalizedStatus,
        reviewStatus: normalizedReviewStatus,
        guidance: buildTrustAssessmentGuidance({
            riskLevel: normalizedRiskLevel,
            status: normalizedStatus,
            reviewStatus: normalizedReviewStatus,
            subjectType
        })
    };
};

export const normalizeTrustScores = (scores = {}, metrics = {}) => {
    const derivedScores = deriveScoresFromMetrics(normalizeTrustMetrics(metrics));
    const componentScores = {
        safety: clampScore(scores.safety ?? derivedScores.safety),
        reliability: clampScore(scores.reliability ?? derivedScores.reliability),
        payment: clampScore(scores.payment ?? derivedScores.payment),
        cancellation: clampScore(scores.cancellation ?? derivedScores.cancellation),
        fraud: clampScore(scores.fraud ?? derivedScores.fraud)
    };
    const overall = scores.overall ?? average(Object.values(componentScores));

    return {
        overall: clampScore(overall),
        ...componentScores
    };
};

export const normalizeTrustMetrics = (metrics = {}) => ({
    completedRides: numberOrZero(metrics.completedRides),
    cancelledRides: numberOrZero(metrics.cancelledRides),
    disputeCount: numberOrZero(metrics.disputeCount),
    incidentCount: numberOrZero(metrics.incidentCount),
    paymentFailureCount: numberOrZero(metrics.paymentFailureCount),
    ratingAverage: Number.isFinite(metrics.ratingAverage) ? metrics.ratingAverage : null,
    lastRideAt: metrics.lastRideAt || null
});

export const normalizeTrustRestrictions = (restrictions = {}) => ({
    rideBookingBlocked: Boolean(restrictions.rideBookingBlocked),
    driverPayoutHold: Boolean(restrictions.driverPayoutHold),
    promoBlocked: Boolean(restrictions.promoBlocked),
    reason: trimToNull(restrictions.reason),
    expiresAt: restrictions.expiresAt || null
});

export const deriveScoresFromMetrics = (metrics = {}) => {
    const normalizedMetrics = normalizeTrustMetrics(metrics);
    const totalRideAttempts = normalizedMetrics.completedRides + normalizedMetrics.cancelledRides;
    const cancellationRate = totalRideAttempts ? normalizedMetrics.cancelledRides / totalRideAttempts : 0;
    const ratingScore = Number.isFinite(normalizedMetrics.ratingAverage)
        ? (normalizedMetrics.ratingAverage / 5) * 100
        : TRUST_SCORE_DEFAULT;

    return {
        safety: clampScore(ratingScore - normalizedMetrics.incidentCount * 12 - normalizedMetrics.disputeCount * 4),
        reliability: clampScore(TRUST_SCORE_DEFAULT - cancellationRate * 80 - normalizedMetrics.incidentCount * 5),
        payment: clampScore(TRUST_SCORE_DEFAULT - normalizedMetrics.paymentFailureCount * 10),
        cancellation: clampScore(TRUST_SCORE_DEFAULT - cancellationRate * 100),
        fraud: clampScore(
            TRUST_SCORE_DEFAULT
            - normalizedMetrics.incidentCount * 10
            - normalizedMetrics.disputeCount * 6
            - normalizedMetrics.paymentFailureCount * 4
        )
    };
};

export const buildDriverTrustInsights = (driver = {}) => {
    const trustScore = numberOrDefault(driver.trustScore, TRUST_ENGINE_DEFAULT_DRIVER_SIGNAL_SCORE);
    const routeFairnessScore = numberOrDefault(driver.routeFairnessScore, TRUST_ENGINE_DEFAULT_DRIVER_SIGNAL_SCORE);
    const onTimeArrivalScore = numberOrDefault(driver.onTimeArrivalScore, TRUST_ENGINE_DEFAULT_DRIVER_SIGNAL_SCORE);
    const cancellationRiskScore = numberOrDefault(driver.cancellationRiskScore, 30);
    const cancellationRiskLevel = driver.cancellationRiskLevel || resolveCancellationRiskLevel(cancellationRiskScore);
    const trustLevel = resolveDriverTrustLevel(trustScore);
    const routeFairnessLevel = resolveRouteFairnessLevel(routeFairnessScore);
    const routeAccuracyScore = calculateRouteAccuracyScore({
        routeFairnessScore,
        onTimeArrivalScore
    });

    return {
        source: TRUST_ENGINE_ASSESSMENT_SOURCES.DRIVER_SIGNALS,
        trustLevel,
        routeFairnessLevel,
        routeAccuracyScore,
        cancellationRiskLevel,
        trustMessage: resolveDriverTrustMessage(trustLevel),
        routeFairnessMessage: resolveRouteFairnessMessage(routeFairnessLevel),
        cancellationRiskMessage: resolveCancellationRiskMessage(cancellationRiskLevel),
        cancellationRiskGuidance: resolveCancellationRiskGuidance(cancellationRiskLevel),
        transparencyBadges: buildTransparencyBadges({
            ...driver,
            trustScore,
            routeFairnessScore,
            onTimeArrivalScore,
            cancellationRiskLevel
        }, {
            trustLevel,
            routeFairnessLevel
        })
    };
};

export const buildRideTrustSignals = ({ driver = {}, fareSource = {} } = {}) => {
    const insights = buildDriverTrustInsights(driver);

    return {
        driverTrustScore: numberOrDefault(driver.trustScore, TRUST_ENGINE_DEFAULT_DRIVER_SIGNAL_SCORE),
        driverReliabilityScore: numberOrDefault(driver.reliabilityScore, driver.onTimeArrivalScore || TRUST_ENGINE_DEFAULT_DRIVER_SIGNAL_SCORE),
        routeFairnessScore: numberOrDefault(driver.routeFairnessScore, TRUST_ENGINE_DEFAULT_DRIVER_SIGNAL_SCORE),
        routeAccuracyScore: insights.routeAccuracyScore,
        cancellationRiskScore: numberOrDefault(driver.cancellationRiskScore, 30),
        cancellationRiskLevel: insights.cancellationRiskLevel,
        cancellationRatio: numberOrZero(driver.cancellationRatio),
        detourPercentage: numberOrZero(driver.detourPercentage),
        onTimeArrivalScore: numberOrDefault(driver.onTimeArrivalScore, TRUST_ENGINE_DEFAULT_DRIVER_SIGNAL_SCORE),
        fairPriceScore: fareSource.confidence?.score || fareSource.confidenceScore || 0
    };
};

export const buildRideTrustSummary = ({ driverOptions = [], fareEstimate = {} } = {}) => {
    const bestDriver = driverOptions[0];
    const fairPriceScore = fareEstimate.confidence?.score || fareEstimate.confidenceScore || 0;

    if (!bestDriver) {
        return {
            fairPriceScore,
            routeAccuracyScore: 0,
            cancellationRiskLevel: RIDE_BOOKING_RISK_LEVELS.HIGH,
            message: 'No trusted drivers are currently available'
        };
    }

    const insights = buildDriverTrustInsights(bestDriver);

    return {
        fairPriceScore,
        routeAccuracyScore: insights.routeAccuracyScore,
        cancellationRiskLevel: insights.cancellationRiskLevel,
        message: 'Best matches are ranked by trust, route fairness, arrival reliability, and cancellation behavior'
    };
};

export const buildTrustAssessmentGuidance = ({ riskLevel, status, reviewStatus, subjectType } = {}) => ({
    shouldEscalate: [
        TRUST_RISK_LEVELS.HIGH,
        TRUST_RISK_LEVELS.CRITICAL
    ].includes(riskLevel),
    suggestedStatus: status,
    suggestedReviewStatus: reviewStatus,
    shouldBlockBooking: status === TRUST_PROFILE_STATUSES.SUSPENDED,
    shouldHoldPayout: subjectType === TRUST_SUBJECT_TYPES.DRIVER && [
        TRUST_RISK_LEVELS.HIGH,
        TRUST_RISK_LEVELS.CRITICAL
    ].includes(riskLevel),
    nextAction: riskLevel === TRUST_RISK_LEVELS.CRITICAL
        ? 'Escalate and apply account restrictions'
        : riskLevel === TRUST_RISK_LEVELS.HIGH
            ? 'Assign reviewer and inspect recent ride history'
            : riskLevel === TRUST_RISK_LEVELS.MEDIUM
                ? 'Monitor trust signals before restricting the account'
                : 'Keep account clear'
});

export const resolveTrustRiskLevel = (overallScore) => {
    if (overallScore >= 80) {
        return TRUST_RISK_LEVELS.LOW;
    }

    if (overallScore >= 60) {
        return TRUST_RISK_LEVELS.MEDIUM;
    }

    if (overallScore >= 40) {
        return TRUST_RISK_LEVELS.HIGH;
    }

    return TRUST_RISK_LEVELS.CRITICAL;
};

export const resolveTrustProfileStatus = (riskLevel) => {
    if (riskLevel === TRUST_RISK_LEVELS.CRITICAL) {
        return TRUST_PROFILE_STATUSES.SUSPENDED;
    }

    if (riskLevel === TRUST_RISK_LEVELS.HIGH) {
        return TRUST_PROFILE_STATUSES.RESTRICTED;
    }

    if (riskLevel === TRUST_RISK_LEVELS.MEDIUM) {
        return TRUST_PROFILE_STATUSES.MONITORING;
    }

    return TRUST_PROFILE_STATUSES.CLEAR;
};

export const resolveTrustReviewStatus = (riskLevel) => (
    riskLevel === TRUST_RISK_LEVELS.LOW
        ? TRUST_REVIEW_STATUSES.RESOLVED
        : TRUST_REVIEW_STATUSES.OPEN
);

const resolveDriverTrustLevel = (score) => {
    if (score >= 95) {
        return TRUST_ENGINE_DRIVER_TRUST_LEVELS.EXCELLENT;
    }

    if (score >= 90) {
        return TRUST_ENGINE_DRIVER_TRUST_LEVELS.HIGH;
    }

    if (score >= 80) {
        return TRUST_ENGINE_DRIVER_TRUST_LEVELS.FAIR;
    }

    return TRUST_ENGINE_DRIVER_TRUST_LEVELS.NEEDS_REVIEW;
};

const resolveRouteFairnessLevel = (score) => {
    if (score >= 95) {
        return TRUST_ENGINE_ROUTE_FAIRNESS_LEVELS.EXCELLENT;
    }

    if (score >= 90) {
        return TRUST_ENGINE_ROUTE_FAIRNESS_LEVELS.STABLE;
    }

    return TRUST_ENGINE_ROUTE_FAIRNESS_LEVELS.WATCH;
};

const calculateRouteAccuracyScore = ({ routeFairnessScore, onTimeArrivalScore }) => Math.min(
    99,
    Math.round((routeFairnessScore + onTimeArrivalScore) / 2)
);

const resolveDriverTrustMessage = (trustLevel) => {
    if (trustLevel === TRUST_ENGINE_DRIVER_TRUST_LEVELS.EXCELLENT) {
        return 'Excellent trust profile across reliability, route fairness, and cancellation behavior';
    }

    if (trustLevel === TRUST_ENGINE_DRIVER_TRUST_LEVELS.HIGH) {
        return 'Strong trust profile with consistently reliable ride behavior';
    }

    if (trustLevel === TRUST_ENGINE_DRIVER_TRUST_LEVELS.FAIR) {
        return 'Fair trust profile with a few behavior signals worth reviewing';
    }

    return 'Trust profile needs review before selecting this driver';
};

const resolveRouteFairnessMessage = (routeFairnessLevel) => {
    if (routeFairnessLevel === TRUST_ENGINE_ROUTE_FAIRNESS_LEVELS.EXCELLENT) {
        return 'Routes are usually close to the expected path with low detours';
    }

    if (routeFairnessLevel === TRUST_ENGINE_ROUTE_FAIRNESS_LEVELS.STABLE) {
        return 'Routes are generally fair with minor detour variance';
    }

    return 'Review route and detour behavior before booking';
};

const resolveCancellationRiskMessage = (riskLevel) => {
    if (riskLevel === RIDE_BOOKING_RISK_LEVELS.LOW) {
        return 'This driver rarely cancels after accepting rides';
    }

    if (riskLevel === RIDE_BOOKING_RISK_LEVELS.MEDIUM) {
        return 'This driver has a moderate cancellation pattern';
    }

    return 'This driver has a higher cancellation pattern';
};

const resolveCancellationRiskGuidance = (riskLevel) => {
    if (riskLevel === RIDE_BOOKING_RISK_LEVELS.LOW) {
        return 'Good match when ride certainty matters';
    }

    if (riskLevel === RIDE_BOOKING_RISK_LEVELS.MEDIUM) {
        return 'Consider backup options if timing is critical';
    }

    return 'Use caution for time-sensitive rides';
};

const resolveCancellationRiskLevel = (score) => {
    if (score <= 20) {
        return RIDE_BOOKING_RISK_LEVELS.LOW;
    }

    if (score <= 50) {
        return RIDE_BOOKING_RISK_LEVELS.MEDIUM;
    }

    return RIDE_BOOKING_RISK_LEVELS.HIGH;
};

const buildTransparencyBadges = (driver, insights) => {
    const badges = [];

    if (insights.trustLevel === TRUST_ENGINE_DRIVER_TRUST_LEVELS.EXCELLENT) {
        badges.push('Excellent trust score');
    }

    if (insights.routeFairnessLevel === TRUST_ENGINE_ROUTE_FAIRNESS_LEVELS.EXCELLENT) {
        badges.push('Low detour history');
    }

    if (driver.cancellationRiskLevel === RIDE_BOOKING_RISK_LEVELS.LOW) {
        badges.push('Low cancellation risk');
    }

    if (driver.onTimeArrivalScore >= 95) {
        badges.push('Strong arrival reliability');
    }

    return badges;
};

const average = (values = []) => {
    if (!values.length) {
        return TRUST_SCORE_DEFAULT;
    }

    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(
    Number.isFinite(value) ? value : TRUST_SCORE_DEFAULT
)));

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;

const numberOrDefault = (value, fallback) => Number.isFinite(value) ? value : fallback;

const trimToNull = (value) => {
    if (typeof value !== 'string') {
        return value || null;
    }

    return value.trim() || null;
};
