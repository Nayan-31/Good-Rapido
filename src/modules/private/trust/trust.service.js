import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import {
    TRUST_ACTION_LOG_LIMIT,
    TRUST_ACTION_TYPES,
    TRUST_PROFILE_STATUSES,
    TRUST_REVIEW_STATUSES,
    TRUST_RISK_LEVELS,
    TRUST_SCORE_DEFAULT,
    TRUST_SUBJECT_TYPES
} from './trust.constants.js';
import {
    toTrustDashboard,
    toTrustOptions,
    toTrustProfile,
    toTrustProfileList,
    toTrustScoreSimulation
} from './dto/trust.dto.js';

export default class TrustService {
    constructor({ trustDao, now = () => new Date() }) {
        this.trustDao = trustDao;
        this.now = now;
    }

    options(authContext) {
        this.assertTrustReadContext(authContext);

        return buildSuccessResponse({
            message: 'Trust options fetched successfully',
            data: {
                options: toTrustOptions()
            }
        });
    }

    async dashboard(authContext) {
        await this.getTrustUserContext(authContext, { write: false });
        const profiles = toPlainArray(await this.trustDao.findDashboardProfiles({ limit: 50 }))
            .map(normalizeProfile);

        return buildSuccessResponse({
            message: 'Trust dashboard fetched successfully',
            data: {
                dashboard: toTrustDashboard(profiles)
            }
        });
    }

    async listProfiles(authContext, query = {}) {
        await this.getTrustUserContext(authContext, { write: false });
        const profiles = toPlainArray(await this.trustDao.findProfiles({
            ...query,
            limit: query.limit || 25
        })).map(normalizeProfile);

        return buildSuccessResponse({
            message: 'Trust profiles fetched successfully',
            data: {
                trust: toTrustProfileList(profiles)
            }
        });
    }

    async getProfile(authContext, profileId) {
        await this.getTrustUserContext(authContext, { write: false });
        const profile = await this.findProfile(profileId);

        return buildSuccessResponse({
            message: 'Trust profile fetched successfully',
            data: {
                profile: toTrustProfile(profile)
            }
        });
    }

    async createProfile(authContext, payload) {
        const actor = await this.getTrustUserContext(authContext, { write: true });
        const existingProfile = await this.trustDao.findBySubject(payload.subjectType, payload.subjectId);

        if (existingProfile) {
            throw AppError.conflict('Trust profile already exists for this subject');
        }

        const normalizedPayload = normalizeCreatePayload(payload, {
            actor,
            now: this.now()
        });

        let profile;

        try {
            profile = normalizeProfile(toPlainObject(await this.trustDao.createProfile(normalizedPayload)));
        } catch (err) {
            if (err.code === 11000) {
                throw AppError.conflict('Trust profile already exists for this subject');
            }

            throw err;
        }

        return buildSuccessResponse({
            statusCode: 201,
            message: 'Trust profile created successfully',
            data: {
                profile: toTrustProfile(profile)
            }
        });
    }

    async updateProfile(authContext, profileId, payload) {
        const actor = await this.getTrustUserContext(authContext, { write: true });
        const existingProfile = await this.findProfile(profileId);
        const updatePayload = normalizeUpdatePayload(existingProfile, payload, {
            action: TRUST_ACTION_TYPES.UPDATE_PROFILE,
            actor,
            now: this.now()
        });
        const updatedProfile = await this.updateTrustProfile(profileId, updatePayload);

        return buildSuccessResponse({
            message: 'Trust profile updated successfully',
            data: {
                profile: toTrustProfile(updatedProfile)
            }
        });
    }

    async assignReviewer(authContext, profileId, payload) {
        const actor = await this.getTrustUserContext(authContext, { write: true });
        const existingProfile = await this.findProfile(profileId);

        assertReviewOpen(existingProfile, 'Resolved trust reviews cannot be reassigned');

        const note = trimToNull(payload.note) || 'Reviewer assigned';
        const updatedProfile = await this.updateTrustProfile(profileId, {
            assignedReviewerId: payload.assignedReviewerId,
            reviewStatus: TRUST_REVIEW_STATUSES.UNDER_REVIEW,
            latestReviewNote: note,
            lastReviewedAt: this.now(),
            lastReviewedBy: getId(actor),
            updatedBy: getId(actor),
            actionLog: appendActionLog(existingProfile, {
                action: TRUST_ACTION_TYPES.ASSIGN_REVIEWER,
                note,
                actor,
                now: this.now()
            })
        });

        return buildSuccessResponse({
            message: 'Trust reviewer assigned successfully',
            data: {
                profile: toTrustProfile(updatedProfile)
            }
        });
    }

    async addNote(authContext, profileId, payload) {
        const actor = await this.getTrustUserContext(authContext, { write: true });
        const existingProfile = await this.findProfile(profileId);

        assertReviewOpen(existingProfile, 'Resolved trust reviews cannot receive new notes');

        const note = trimToNull(payload.note);
        const updatedProfile = await this.updateTrustProfile(profileId, {
            latestReviewNote: note,
            lastReviewedAt: this.now(),
            lastReviewedBy: getId(actor),
            updatedBy: getId(actor),
            actionLog: appendActionLog(existingProfile, {
                action: TRUST_ACTION_TYPES.ADD_NOTE,
                note,
                actor,
                now: this.now()
            })
        });

        return buildSuccessResponse({
            message: 'Trust note added successfully',
            data: {
                profile: toTrustProfile(updatedProfile)
            }
        });
    }

    async resolveReview(authContext, profileId, payload = {}) {
        const actor = await this.getTrustUserContext(authContext, { write: true });
        const existingProfile = await this.findProfile(profileId);

        assertReviewOpen(existingProfile, 'Trust review is already resolved');

        const note = trimToNull(payload.note) || 'Trust review resolved';
        const updatedProfile = await this.updateTrustProfile(profileId, {
            status: payload.status || existingProfile.status,
            reviewStatus: TRUST_REVIEW_STATUSES.RESOLVED,
            latestReviewNote: note,
            lastReviewedAt: this.now(),
            lastReviewedBy: getId(actor),
            updatedBy: getId(actor),
            actionLog: appendActionLog(existingProfile, {
                action: TRUST_ACTION_TYPES.RESOLVE_REVIEW,
                note,
                actor,
                now: this.now()
            })
        });

        return buildSuccessResponse({
            message: 'Trust review resolved successfully',
            data: {
                profile: toTrustProfile(updatedProfile)
            }
        });
    }

    async simulate(authContext, payload) {
        await this.getTrustUserContext(authContext, { write: false });

        const assessment = buildTrustAssessment(payload);

        return buildSuccessResponse({
            message: 'Trust score simulation completed successfully',
            data: toTrustScoreSimulation({
                ...assessment,
                guidance: buildAssessmentGuidance(assessment)
            })
        });
    }

    async findProfile(profileId) {
        const profile = normalizeProfile(toPlainObject(await this.trustDao.findById(profileId)));

        if (!profile) {
            throw AppError.notFound('Trust profile not found');
        }

        return profile;
    }

    async updateTrustProfile(profileId, payload) {
        const updatedProfile = normalizeProfile(toPlainObject(await this.trustDao.updateProfile(profileId, payload)));

        if (!updatedProfile) {
            throw AppError.notFound('Trust profile not found');
        }

        return updatedProfile;
    }

    async getTrustUserContext(authContext, { write = false } = {}) {
        if (write) {
            this.assertTrustWriteContext(authContext);
        } else {
            this.assertTrustReadContext(authContext);
        }

        const privateUser = toPlainObject(await this.trustDao.findPrivateUserById(authContext.userId));

        if (!privateUser) {
            throw AppError.notFound('Private user account not found');
        }

        if (privateUser.accountStatus !== PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`Private user account is ${privateUser.accountStatus}`);
        }

        return privateUser;
    }

    assertTrustReadContext(authContext) {
        if (!authContext?.userId || ![
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ].includes(authContext.role)) {
            throw AppError.forbidden('Trust private access is required');
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.TRUST_READ)) {
            throw AppError.forbidden('Trust read permission is required');
        }

        return authContext;
    }

    assertTrustWriteContext(authContext) {
        this.assertTrustReadContext(authContext);

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.TRUST_WRITE)) {
            throw AppError.forbidden('Trust write permission is required');
        }
    }
}

const normalizeCreatePayload = (payload = {}, { actor, now }) => {
    const assessment = buildTrustAssessment(payload);
    const note = trimToNull(payload.note);

    return {
        trustCode: createTrustCode(payload.subjectType, payload.subjectId, now),
        subjectType: payload.subjectType,
        subjectId: payload.subjectId.trim(),
        subjectLabel: trimToNull(payload.subjectLabel),
        riskLevel: assessment.riskLevel,
        status: assessment.status,
        reviewStatus: assessment.reviewStatus,
        scores: assessment.scores,
        metrics: assessment.metrics,
        restrictions: normalizeRestrictions(payload.restrictions),
        assignedReviewerId: payload.assignedReviewerId || null,
        latestReviewNote: note,
        lastReviewedAt: note ? now : null,
        lastReviewedBy: note ? getId(actor) : null,
        actionLog: [createActionLogEntry({
            action: TRUST_ACTION_TYPES.CREATE_PROFILE,
            note: note || `Trust profile created with ${assessment.riskLevel} risk`,
            actor,
            now
        })],
        createdBy: getId(actor),
        updatedBy: getId(actor)
    };
};

const normalizeUpdatePayload = (existingProfile, payload = {}, { action, actor, now }) => {
    const nextMetrics = normalizeMetrics({
        ...existingProfile.metrics,
        ...(payload.metrics || {})
    });
    const nextScores = payload.scores
        ? normalizeScores({ ...existingProfile.scores, ...payload.scores }, nextMetrics)
        : payload.metrics
            ? normalizeScores({}, nextMetrics)
            : normalizeScores(existingProfile.scores, nextMetrics);
    const assessment = buildTrustAssessment({
        scores: nextScores,
        metrics: nextMetrics,
        riskLevel: payload.riskLevel,
        status: payload.status,
        reviewStatus: payload.reviewStatus
    });
    const note = trimToNull(payload.note);
    const shouldRefreshAssessment = Boolean(payload.scores || payload.metrics || payload.riskLevel);

    return {
        ...(payload.subjectLabel !== undefined ? { subjectLabel: trimToNull(payload.subjectLabel) } : {}),
        ...(payload.scores || payload.metrics ? { scores: assessment.scores } : {}),
        ...(payload.metrics !== undefined ? { metrics: assessment.metrics } : {}),
        ...(payload.restrictions !== undefined ? {
            restrictions: normalizeRestrictions({
                ...existingProfile.restrictions,
                ...payload.restrictions
            })
        } : {}),
        ...(shouldRefreshAssessment ? { riskLevel: assessment.riskLevel } : {}),
        ...(payload.status !== undefined || shouldRefreshAssessment ? { status: assessment.status } : {}),
        ...(payload.reviewStatus !== undefined ? { reviewStatus: assessment.reviewStatus } : {}),
        ...(payload.assignedReviewerId !== undefined ? { assignedReviewerId: payload.assignedReviewerId || null } : {}),
        ...(note ? { latestReviewNote: note } : {}),
        lastReviewedAt: now,
        lastReviewedBy: getId(actor),
        updatedBy: getId(actor),
        actionLog: appendActionLog(existingProfile, {
            action,
            note: note || 'Trust profile updated',
            actor,
            now
        })
    };
};

const buildTrustAssessment = ({
    scores,
    metrics,
    riskLevel,
    status,
    reviewStatus
} = {}) => {
    const normalizedMetrics = normalizeMetrics(metrics);
    const normalizedScores = normalizeScores(scores, normalizedMetrics);
    const normalizedRiskLevel = riskLevel || resolveRiskLevel(normalizedScores.overall);

    return {
        scores: normalizedScores,
        metrics: normalizedMetrics,
        riskLevel: normalizedRiskLevel,
        status: status || resolveStatus(normalizedRiskLevel),
        reviewStatus: reviewStatus || resolveReviewStatus(normalizedRiskLevel)
    };
};

const normalizeProfile = (profile) => {
    if (!profile) {
        return null;
    }

    return {
        ...profile,
        subjectType: profile.subjectType || TRUST_SUBJECT_TYPES.RIDER,
        riskLevel: profile.riskLevel || TRUST_RISK_LEVELS.LOW,
        status: profile.status || TRUST_PROFILE_STATUSES.CLEAR,
        reviewStatus: profile.reviewStatus || TRUST_REVIEW_STATUSES.OPEN,
        scores: normalizeScores(profile.scores, profile.metrics),
        metrics: normalizeMetrics(profile.metrics),
        restrictions: normalizeRestrictions(profile.restrictions),
        actionLog: Array.isArray(profile.actionLog) ? profile.actionLog : []
    };
};

const normalizeScores = (scores = {}, metrics = {}) => {
    const derivedScores = deriveScoresFromMetrics(normalizeMetrics(metrics));
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

const normalizeMetrics = (metrics = {}) => ({
    completedRides: numberOrZero(metrics.completedRides),
    cancelledRides: numberOrZero(metrics.cancelledRides),
    disputeCount: numberOrZero(metrics.disputeCount),
    incidentCount: numberOrZero(metrics.incidentCount),
    paymentFailureCount: numberOrZero(metrics.paymentFailureCount),
    ratingAverage: Number.isFinite(metrics.ratingAverage) ? metrics.ratingAverage : null,
    lastRideAt: metrics.lastRideAt || null
});

const normalizeRestrictions = (restrictions = {}) => ({
    rideBookingBlocked: Boolean(restrictions.rideBookingBlocked),
    driverPayoutHold: Boolean(restrictions.driverPayoutHold),
    promoBlocked: Boolean(restrictions.promoBlocked),
    reason: trimToNull(restrictions.reason),
    expiresAt: restrictions.expiresAt || null
});

const deriveScoresFromMetrics = (metrics = {}) => {
    const totalRideAttempts = metrics.completedRides + metrics.cancelledRides;
    const cancellationRate = totalRideAttempts ? metrics.cancelledRides / totalRideAttempts : 0;
    const ratingScore = Number.isFinite(metrics.ratingAverage)
        ? (metrics.ratingAverage / 5) * 100
        : TRUST_SCORE_DEFAULT;

    return {
        safety: clampScore(ratingScore - metrics.incidentCount * 12 - metrics.disputeCount * 4),
        reliability: clampScore(TRUST_SCORE_DEFAULT - cancellationRate * 80 - metrics.incidentCount * 5),
        payment: clampScore(TRUST_SCORE_DEFAULT - metrics.paymentFailureCount * 10),
        cancellation: clampScore(TRUST_SCORE_DEFAULT - cancellationRate * 100),
        fraud: clampScore(TRUST_SCORE_DEFAULT - metrics.incidentCount * 10 - metrics.disputeCount * 6 - metrics.paymentFailureCount * 4)
    };
};

const resolveRiskLevel = (overallScore) => {
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

const resolveStatus = (riskLevel) => {
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

const resolveReviewStatus = (riskLevel) => (
    riskLevel === TRUST_RISK_LEVELS.LOW
        ? TRUST_REVIEW_STATUSES.RESOLVED
        : TRUST_REVIEW_STATUSES.OPEN
);

const buildAssessmentGuidance = ({ riskLevel, status, reviewStatus }) => ({
    shouldEscalate: [
        TRUST_RISK_LEVELS.HIGH,
        TRUST_RISK_LEVELS.CRITICAL
    ].includes(riskLevel),
    suggestedStatus: status,
    suggestedReviewStatus: reviewStatus,
    nextAction: riskLevel === TRUST_RISK_LEVELS.CRITICAL
        ? 'Escalate and apply account restrictions'
        : riskLevel === TRUST_RISK_LEVELS.HIGH
            ? 'Assign reviewer and inspect recent ride history'
            : riskLevel === TRUST_RISK_LEVELS.MEDIUM
                ? 'Monitor trust signals before restricting the account'
                : 'Keep account clear'
});

const appendActionLog = (profile = {}, { action, note, actor, now }) => [
    ...(Array.isArray(profile.actionLog) ? profile.actionLog : []).slice(-(TRUST_ACTION_LOG_LIMIT - 1)),
    createActionLogEntry({
        action,
        note,
        actor,
        now
    })
];

const createActionLogEntry = ({ action, note, actor, now }) => ({
    action,
    note: trimToNull(note),
    actorId: getId(actor),
    actorRole: actor?.role || null,
    createdAt: now
});

const assertReviewOpen = (profile = {}, message) => {
    if (profile.reviewStatus === TRUST_REVIEW_STATUSES.RESOLVED) {
        throw AppError.badRequest(message);
    }
};

const createTrustCode = (subjectType, subjectId, date) => {
    const compactTimestamp = date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const normalizedSubject = subjectId.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 16).toUpperCase();

    return `TRUST-${subjectType.toUpperCase()}-${normalizedSubject || 'SUBJECT'}-${compactTimestamp}`;
};

const average = (values = []) => {
    if (!values.length) {
        return TRUST_SCORE_DEFAULT;
    }

    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : TRUST_SCORE_DEFAULT)));

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;

const trimToNull = (value) => {
    if (typeof value !== 'string') {
        return value || null;
    }

    return value.trim() || null;
};

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const toPlainArray = (documents = []) => documents.map((document) => toPlainObject(document));

const getId = (document = {}) => document._id?.toString?.() || document.id || null;
