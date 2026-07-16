import {
    TRUST_ENGINE_ASSESSMENT_SOURCES,
    TRUST_ENGINE_DRIVER_TRUST_LEVELS,
    TRUST_ENGINE_METRIC_WEIGHTS,
    TRUST_ENGINE_PROFILE_STATUSES,
    TRUST_ENGINE_REVIEW_STATUSES,
    TRUST_ENGINE_RISK_LEVELS,
    TRUST_ENGINE_ROUTE_FAIRNESS_LEVELS,
    TRUST_ENGINE_SCORE_BANDS,
    TRUST_ENGINE_SCORE_DEFAULT,
    TRUST_ENGINE_SCORE_FIELDS,
    TRUST_ENGINE_SUBJECT_TYPES
} from '../trust-engine.constants.js';

export const toTrustEngineOptions = () => ({
    subjectTypes: Object.values(TRUST_ENGINE_SUBJECT_TYPES),
    riskLevels: Object.values(TRUST_ENGINE_RISK_LEVELS),
    statuses: Object.values(TRUST_ENGINE_PROFILE_STATUSES),
    reviewStatuses: Object.values(TRUST_ENGINE_REVIEW_STATUSES),
    assessmentSources: Object.values(TRUST_ENGINE_ASSESSMENT_SOURCES),
    driverTrustLevels: Object.values(TRUST_ENGINE_DRIVER_TRUST_LEVELS),
    routeFairnessLevels: Object.values(TRUST_ENGINE_ROUTE_FAIRNESS_LEVELS),
    scoreFields: TRUST_ENGINE_SCORE_FIELDS,
    scoreBands: TRUST_ENGINE_SCORE_BANDS,
    metricWeights: TRUST_ENGINE_METRIC_WEIGHTS
});

export const toTrustEngineAssessment = (assessment = {}) => ({
    source: assessment.source || TRUST_ENGINE_ASSESSMENT_SOURCES.METRICS,
    subjectType: assessment.subjectType || null,
    scores: toTrustScores(assessment.scores),
    metrics: toTrustMetrics(assessment.metrics),
    riskLevel: assessment.riskLevel || TRUST_ENGINE_RISK_LEVELS.LOW,
    status: assessment.status || TRUST_ENGINE_PROFILE_STATUSES.CLEAR,
    reviewStatus: assessment.reviewStatus || TRUST_ENGINE_REVIEW_STATUSES.RESOLVED,
    guidance: {
        shouldEscalate: Boolean(assessment.guidance?.shouldEscalate),
        suggestedStatus: assessment.guidance?.suggestedStatus || null,
        suggestedReviewStatus: assessment.guidance?.suggestedReviewStatus || null,
        shouldBlockBooking: Boolean(assessment.guidance?.shouldBlockBooking),
        shouldHoldPayout: Boolean(assessment.guidance?.shouldHoldPayout),
        nextAction: assessment.guidance?.nextAction || null
    }
});

export const toTrustEngineDriverEvaluation = ({ driver = {}, insights = {}, signals = {} } = {}) => ({
    driver: {
        driverId: driver.driverId || driver.id || null,
        fullName: driver.fullName || null,
        rating: numberOrZero(driver.rating),
        completedRides: numberOrZero(driver.completedRides)
    },
    trust: {
        score: numberOrZero(driver.trustScore),
        level: insights.trustLevel || null,
        message: insights.trustMessage || null
    },
    reliability: {
        score: numberOrZero(driver.reliabilityScore),
        onTimeArrivalScore: numberOrZero(driver.onTimeArrivalScore)
    },
    routeFairness: {
        score: numberOrZero(driver.routeFairnessScore),
        level: insights.routeFairnessLevel || null,
        routeAccuracyScore: numberOrZero(insights.routeAccuracyScore),
        detourPercentage: numberOrZero(driver.detourPercentage),
        message: insights.routeFairnessMessage || null
    },
    cancellationRisk: {
        score: numberOrZero(driver.cancellationRiskScore),
        level: insights.cancellationRiskLevel || driver.cancellationRiskLevel || null,
        cancellationRatio: numberOrZero(driver.cancellationRatio),
        message: insights.cancellationRiskMessage || null,
        riderGuidance: insights.cancellationRiskGuidance || null
    },
    transparencyBadges: insights.transparencyBadges || [],
    rideTrustSignals: signals
});

const toTrustScores = (scores = {}) => ({
    overall: numberOrDefault(scores.overall),
    safety: numberOrDefault(scores.safety),
    reliability: numberOrDefault(scores.reliability),
    payment: numberOrDefault(scores.payment),
    cancellation: numberOrDefault(scores.cancellation),
    fraud: numberOrDefault(scores.fraud)
});

const toTrustMetrics = (metrics = {}) => ({
    completedRides: numberOrZero(metrics.completedRides),
    cancelledRides: numberOrZero(metrics.cancelledRides),
    disputeCount: numberOrZero(metrics.disputeCount),
    incidentCount: numberOrZero(metrics.incidentCount),
    paymentFailureCount: numberOrZero(metrics.paymentFailureCount),
    ratingAverage: Number.isFinite(metrics.ratingAverage) ? metrics.ratingAverage : null,
    lastRideAt: metrics.lastRideAt || null
});

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;

const numberOrDefault = (value) => Number.isFinite(value) ? value : TRUST_ENGINE_SCORE_DEFAULT;
