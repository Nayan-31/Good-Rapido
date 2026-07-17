import {
    TRUST_PROFILE_STATUSES,
    TRUST_REVIEW_STATUSES,
    TRUST_RISK_LEVELS,
    TRUST_SCORE_BANDS,
    TRUST_SCORE_DEFAULT,
    TRUST_SUBJECT_TYPES
} from '../trust.constants.js';

export const toTrustOptions = () => ({
    subjectTypes: Object.values(TRUST_SUBJECT_TYPES),
    riskLevels: Object.values(TRUST_RISK_LEVELS),
    statuses: Object.values(TRUST_PROFILE_STATUSES),
    reviewStatuses: Object.values(TRUST_REVIEW_STATUSES),
    scoreBands: TRUST_SCORE_BANDS,
    scoreFields: ['overall', 'safety', 'reliability', 'payment', 'cancellation', 'fraud']
});

export const toTrustDashboard = (profiles = []) => ({
    summary: toTrustSummary(profiles),
    highRiskProfiles: profiles
        .filter((profile) => [
            TRUST_RISK_LEVELS.HIGH,
            TRUST_RISK_LEVELS.CRITICAL
        ].includes(profile.riskLevel))
        .map(toTrustProfileListItem),
    openReviews: profiles
        .filter((profile) => profile.reviewStatus !== TRUST_REVIEW_STATUSES.RESOLVED)
        .map(toTrustProfileListItem),
    recentProfiles: [...profiles]
        .sort((left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime())
        .slice(0, 8)
        .map(toTrustProfileListItem)
});

export const toTrustProfileList = (profiles = []) => ({
    profiles: profiles.map(toTrustProfileListItem),
    summary: toTrustSummary(profiles)
});

export const toTrustProfileListItem = (profile = {}) => ({
    id: getId(profile),
    trustCode: profile.trustCode || null,
    subjectType: profile.subjectType || null,
    subjectId: profile.subjectId || null,
    subjectLabel: profile.subjectLabel || null,
    riskLevel: profile.riskLevel || TRUST_RISK_LEVELS.LOW,
    status: profile.status || TRUST_PROFILE_STATUSES.CLEAR,
    reviewStatus: profile.reviewStatus || TRUST_REVIEW_STATUSES.OPEN,
    overallScore: numberOrDefault(profile.scores?.overall),
    assignedReviewerId: toId(profile.assignedReviewerId),
    latestReviewNote: profile.latestReviewNote || null,
    lastReviewedAt: profile.lastReviewedAt || null,
    updatedAt: profile.updatedAt || null,
    guidance: toTrustGuidance(profile)
});

export const toTrustProfile = (profile = {}) => ({
    ...toTrustProfileListItem(profile),
    scores: toTrustScores(profile.scores),
    metrics: toTrustMetrics(profile.metrics),
    restrictions: toTrustRestrictions(profile.restrictions),
    lastReviewedBy: toId(profile.lastReviewedBy),
    actionLog: toTrustActionLog(profile.actionLog),
    createdBy: toId(profile.createdBy),
    updatedBy: toId(profile.updatedBy),
    createdAt: profile.createdAt || null
});

export const toTrustScoreSimulation = ({ scores, metrics, riskLevel, status, reviewStatus, guidance }) => ({
    scores: toTrustScores(scores),
    metrics: toTrustMetrics(metrics),
    riskLevel,
    status,
    reviewStatus,
    guidance
});

const toTrustSummary = (profiles = []) => ({
    totalProfiles: profiles.length,
    lowRiskProfiles: countByRiskLevel(profiles, TRUST_RISK_LEVELS.LOW),
    mediumRiskProfiles: countByRiskLevel(profiles, TRUST_RISK_LEVELS.MEDIUM),
    highRiskProfiles: countByRiskLevel(profiles, TRUST_RISK_LEVELS.HIGH),
    criticalRiskProfiles: countByRiskLevel(profiles, TRUST_RISK_LEVELS.CRITICAL),
    openReviews: countByReviewStatus(profiles, TRUST_REVIEW_STATUSES.OPEN),
    underReviewProfiles: countByReviewStatus(profiles, TRUST_REVIEW_STATUSES.UNDER_REVIEW),
    resolvedReviews: countByReviewStatus(profiles, TRUST_REVIEW_STATUSES.RESOLVED),
    restrictedProfiles: countByStatus(profiles, TRUST_PROFILE_STATUSES.RESTRICTED),
    suspendedProfiles: countByStatus(profiles, TRUST_PROFILE_STATUSES.SUSPENDED),
    averageOverallScore: averageScore(profiles)
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

const toTrustRestrictions = (restrictions = {}) => ({
    rideBookingBlocked: Boolean(restrictions.rideBookingBlocked),
    driverPayoutHold: Boolean(restrictions.driverPayoutHold),
    promoBlocked: Boolean(restrictions.promoBlocked),
    reason: restrictions.reason || null,
    expiresAt: restrictions.expiresAt || null
});

const toTrustActionLog = (actionLog = []) => actionLog.map((entry) => ({
    action: entry.action,
    note: entry.note || null,
    actorId: toId(entry.actorId),
    actorRole: entry.actorRole || null,
    createdAt: entry.createdAt || null
}));

const toTrustGuidance = (profile = {}) => ({
    canAssign: profile.reviewStatus !== TRUST_REVIEW_STATUSES.RESOLVED,
    canAddNote: profile.reviewStatus !== TRUST_REVIEW_STATUSES.RESOLVED,
    canResolve: profile.reviewStatus !== TRUST_REVIEW_STATUSES.RESOLVED,
    shouldBlockBooking: profile.status === TRUST_PROFILE_STATUSES.SUSPENDED || Boolean(profile.restrictions?.rideBookingBlocked),
    shouldHoldPayout: profile.subjectType === TRUST_SUBJECT_TYPES.DRIVER && Boolean(profile.restrictions?.driverPayoutHold),
    nextAction: resolveNextAction(profile)
});

const resolveNextAction = (profile = {}) => {
    if (profile.reviewStatus === TRUST_REVIEW_STATUSES.RESOLVED) {
        return 'No action needed';
    }

    if (profile.riskLevel === TRUST_RISK_LEVELS.CRITICAL) {
        return 'Escalate and review account restrictions';
    }

    if (profile.riskLevel === TRUST_RISK_LEVELS.HIGH) {
        return 'Assign reviewer and inspect recent rides';
    }

    if (profile.riskLevel === TRUST_RISK_LEVELS.MEDIUM) {
        return 'Monitor signals and add review notes';
    }

    return 'Keep profile clear unless new signals arrive';
};

const countByRiskLevel = (profiles = [], riskLevel) => profiles.filter((profile) => profile.riskLevel === riskLevel).length;

const countByReviewStatus = (profiles = [], reviewStatus) => (
    profiles.filter((profile) => profile.reviewStatus === reviewStatus).length
);

const countByStatus = (profiles = [], status) => profiles.filter((profile) => profile.status === status).length;

const averageScore = (profiles = []) => {
    if (!profiles.length) {
        return 0;
    }

    const totalScore = profiles.reduce((sum, profile) => sum + numberOrDefault(profile.scores?.overall), 0);

    return Number((totalScore / profiles.length).toFixed(2));
};

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;

const numberOrDefault = (value) => Number.isFinite(value) ? value : TRUST_SCORE_DEFAULT;

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const toId = (value) => value?._id?.toString?.() || value?.toString?.() || value || null;
