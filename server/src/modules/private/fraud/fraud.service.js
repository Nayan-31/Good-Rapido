import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import {
    FRAUD_ACTION_LOG_LIMIT,
    FRAUD_ACTION_TYPES,
    FRAUD_CASE_SOURCES,
    FRAUD_CASE_STATUSES,
    FRAUD_CASE_TYPES,
    FRAUD_RESOLUTION_DECISIONS,
    FRAUD_SUBJECT_TYPES
} from './fraud.constants.js';
import {
    toFraudCase,
    toFraudCaseList,
    toFraudDashboard,
    toFraudOptions,
    toFraudScoreSimulation
} from './dto/fraud.dto.js';
import {
    buildFraudAssessment as buildCoreFraudAssessment,
    buildFraudGuidance as buildCoreFraudGuidance,
    normalizeFraudActions,
    normalizeFraudEvidence,
    normalizeFraudSignals,
    recommendedFraudActionsFor,
    resolveFraudSeverity
} from '../../core/fraud-engine/fraud-engine.engine.js';

export default class FraudService {
    constructor({ fraudDao, now = () => new Date() }) {
        this.fraudDao = fraudDao;
        this.now = now;
    }

    options(authContext) {
        this.assertFraudReadContext(authContext);

        return buildSuccessResponse({
            message: 'Fraud options fetched successfully',
            data: {
                options: toFraudOptions()
            }
        });
    }

    async dashboard(authContext) {
        await this.getFraudUserContext(authContext, { write: false });
        const cases = toPlainArray(await this.fraudDao.findDashboardCases({ limit: 50 }))
            .map(normalizeFraudCase);

        return buildSuccessResponse({
            message: 'Fraud dashboard fetched successfully',
            data: {
                dashboard: toFraudDashboard(cases)
            }
        });
    }

    async listCases(authContext, query = {}) {
        await this.getFraudUserContext(authContext, { write: false });
        const cases = toPlainArray(await this.fraudDao.findCases({
            ...query,
            limit: query.limit || 25
        })).map(normalizeFraudCase);

        return buildSuccessResponse({
            message: 'Fraud cases fetched successfully',
            data: {
                fraud: toFraudCaseList(cases)
            }
        });
    }

    async getCase(authContext, caseId) {
        await this.getFraudUserContext(authContext, { write: false });
        const fraudCase = await this.findCase(caseId);

        return buildSuccessResponse({
            message: 'Fraud case fetched successfully',
            data: {
                case: toFraudCase(fraudCase)
            }
        });
    }

    async createCase(authContext, payload) {
        const actor = await this.getFraudUserContext(authContext, { write: true });
        const normalizedPayload = normalizeCreatePayload(payload, {
            actor,
            now: this.now()
        });

        let fraudCase;

        try {
            fraudCase = normalizeFraudCase(toPlainObject(await this.fraudDao.createCase(normalizedPayload)));
        } catch (err) {
            if (err.code === 11000) {
                throw AppError.conflict('Fraud case already exists with this code');
            }

            throw err;
        }

        return buildSuccessResponse({
            statusCode: 201,
            message: 'Fraud case created successfully',
            data: {
                case: toFraudCase(fraudCase)
            }
        });
    }

    async updateCase(authContext, caseId, payload) {
        const actor = await this.getFraudUserContext(authContext, { write: true });
        const existingCase = await this.findCase(caseId);
        const updatePayload = normalizeUpdatePayload(existingCase, payload, {
            action: FRAUD_ACTION_TYPES.UPDATE_CASE,
            actor,
            now: this.now()
        });
        const updatedCase = await this.updateFraudCase(caseId, updatePayload);

        return buildSuccessResponse({
            message: 'Fraud case updated successfully',
            data: {
                case: toFraudCase(updatedCase)
            }
        });
    }

    async assignReviewer(authContext, caseId, payload) {
        const actor = await this.getFraudUserContext(authContext, { write: true });
        const existingCase = await this.findCase(caseId);

        assertCaseActionable(existingCase, 'Closed fraud cases cannot be reassigned');

        const note = trimToNull(payload.note) || 'Fraud reviewer assigned';
        const updatedCase = await this.updateFraudCase(caseId, {
            assignedReviewerId: payload.assignedReviewerId,
            status: FRAUD_CASE_STATUSES.UNDER_REVIEW,
            latestReviewNote: note,
            lastReviewedAt: this.now(),
            lastReviewedBy: getId(actor),
            updatedBy: getId(actor),
            actionLog: appendActionLog(existingCase, {
                action: FRAUD_ACTION_TYPES.ASSIGN_REVIEWER,
                note,
                actor,
                now: this.now()
            })
        });

        return buildSuccessResponse({
            message: 'Fraud reviewer assigned successfully',
            data: {
                case: toFraudCase(updatedCase)
            }
        });
    }

    async addNote(authContext, caseId, payload) {
        const actor = await this.getFraudUserContext(authContext, { write: true });
        const existingCase = await this.findCase(caseId);

        assertCaseNotClosed(existingCase, 'Closed fraud cases cannot receive new notes');

        const note = trimToNull(payload.note);
        const updatedCase = await this.updateFraudCase(caseId, {
            latestReviewNote: note,
            lastReviewedAt: this.now(),
            lastReviewedBy: getId(actor),
            updatedBy: getId(actor),
            actionLog: appendActionLog(existingCase, {
                action: FRAUD_ACTION_TYPES.ADD_NOTE,
                note,
                actor,
                now: this.now()
            })
        });

        return buildSuccessResponse({
            message: 'Fraud note added successfully',
            data: {
                case: toFraudCase(updatedCase)
            }
        });
    }

    async confirmCase(authContext, caseId, payload = {}) {
        const actor = await this.getFraudUserContext(authContext, { write: true });
        const existingCase = await this.findCase(caseId);

        assertCaseActionable(existingCase, 'Only open or under review fraud cases can be confirmed');

        const note = trimToNull(payload.note) || 'Fraud case confirmed';
        const updatedCase = await this.updateFraudCase(caseId, {
            status: FRAUD_CASE_STATUSES.CONFIRMED,
            actions: normalizeActions({
                ...recommendedActionsFor(existingCase),
                ...existingCase.actions,
                ...(payload.actions || {})
            }),
            resolution: {
                decision: FRAUD_RESOLUTION_DECISIONS.CONFIRMED_FRAUD,
                note,
                resolvedAt: this.now(),
                resolvedBy: getId(actor)
            },
            latestReviewNote: note,
            lastReviewedAt: this.now(),
            lastReviewedBy: getId(actor),
            updatedBy: getId(actor),
            actionLog: appendActionLog(existingCase, {
                action: FRAUD_ACTION_TYPES.CONFIRM_CASE,
                note,
                actor,
                now: this.now()
            })
        });

        return buildSuccessResponse({
            message: 'Fraud case confirmed successfully',
            data: {
                case: toFraudCase(updatedCase)
            }
        });
    }

    async dismissCase(authContext, caseId, payload = {}) {
        const actor = await this.getFraudUserContext(authContext, { write: true });
        const existingCase = await this.findCase(caseId);

        assertCaseActionable(existingCase, 'Only open or under review fraud cases can be dismissed');

        const note = trimToNull(payload.note) || 'Fraud case dismissed as false positive';
        const updatedCase = await this.updateFraudCase(caseId, {
            status: FRAUD_CASE_STATUSES.DISMISSED,
            resolution: {
                decision: FRAUD_RESOLUTION_DECISIONS.FALSE_POSITIVE,
                note,
                resolvedAt: this.now(),
                resolvedBy: getId(actor)
            },
            latestReviewNote: note,
            lastReviewedAt: this.now(),
            lastReviewedBy: getId(actor),
            updatedBy: getId(actor),
            actionLog: appendActionLog(existingCase, {
                action: FRAUD_ACTION_TYPES.DISMISS_CASE,
                note,
                actor,
                now: this.now()
            })
        });

        return buildSuccessResponse({
            message: 'Fraud case dismissed successfully',
            data: {
                case: toFraudCase(updatedCase)
            }
        });
    }

    async resolveCase(authContext, caseId, payload = {}) {
        const actor = await this.getFraudUserContext(authContext, { write: true });
        const existingCase = await this.findCase(caseId);

        assertCaseNotClosed(existingCase, 'Fraud case is already closed');

        const note = trimToNull(payload.note) || 'Fraud case resolved';
        const decision = payload.decision || resolveDefaultDecision(existingCase.status);
        const updatedCase = await this.updateFraudCase(caseId, {
            status: FRAUD_CASE_STATUSES.RESOLVED,
            actions: normalizeActions({
                ...existingCase.actions,
                ...(payload.actions || {})
            }),
            resolution: {
                decision,
                note,
                resolvedAt: this.now(),
                resolvedBy: getId(actor)
            },
            latestReviewNote: note,
            lastReviewedAt: this.now(),
            lastReviewedBy: getId(actor),
            updatedBy: getId(actor),
            actionLog: appendActionLog(existingCase, {
                action: FRAUD_ACTION_TYPES.RESOLVE_CASE,
                note,
                actor,
                now: this.now()
            })
        });

        return buildSuccessResponse({
            message: 'Fraud case resolved successfully',
            data: {
                case: toFraudCase(updatedCase)
            }
        });
    }

    async simulate(authContext, payload) {
        await this.getFraudUserContext(authContext, { write: false });

        const assessment = buildFraudAssessment(payload);

        return buildSuccessResponse({
            message: 'Fraud score simulation completed successfully',
            data: toFraudScoreSimulation({
                ...assessment,
                actions: recommendedActionsFor(assessment),
                guidance: buildAssessmentGuidance(assessment)
            })
        });
    }

    async findCase(caseId) {
        const fraudCase = normalizeFraudCase(toPlainObject(await this.fraudDao.findById(caseId)));

        if (!fraudCase) {
            throw AppError.notFound('Fraud case not found');
        }

        return fraudCase;
    }

    async updateFraudCase(caseId, payload) {
        const updatedCase = normalizeFraudCase(toPlainObject(await this.fraudDao.updateCase(caseId, payload)));

        if (!updatedCase) {
            throw AppError.notFound('Fraud case not found');
        }

        return updatedCase;
    }

    async getFraudUserContext(authContext, { write = false } = {}) {
        if (write) {
            this.assertFraudWriteContext(authContext);
        } else {
            this.assertFraudReadContext(authContext);
        }

        const privateUser = toPlainObject(await this.fraudDao.findPrivateUserById(authContext.userId));

        if (!privateUser) {
            throw AppError.notFound('Private user account not found');
        }

        if (privateUser.accountStatus !== PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`Private user account is ${privateUser.accountStatus}`);
        }

        return privateUser;
    }

    assertFraudReadContext(authContext) {
        if (!authContext?.userId || ![
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ].includes(authContext.role)) {
            throw AppError.forbidden('Fraud private access is required');
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.FRAUD_READ)) {
            throw AppError.forbidden('Fraud read permission is required');
        }

        return authContext;
    }

    assertFraudWriteContext(authContext) {
        this.assertFraudReadContext(authContext);

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.FRAUD_WRITE)) {
            throw AppError.forbidden('Fraud write permission is required');
        }
    }
}

const normalizeCreatePayload = (payload = {}, { actor, now }) => {
    const assessment = buildFraudAssessment(payload);
    const note = trimToNull(payload.note);

    return {
        caseCode: createFraudCaseCode(payload.caseType, payload.subjectType, payload.subjectId, now),
        subjectType: payload.subjectType,
        subjectId: payload.subjectId.trim(),
        subjectLabel: trimToNull(payload.subjectLabel),
        caseType: payload.caseType,
        source: payload.source || FRAUD_CASE_SOURCES.SYSTEM,
        severity: assessment.severity,
        status: assessment.status,
        riskScore: assessment.riskScore,
        confidenceScore: assessment.confidenceScore,
        signals: assessment.signals,
        evidence: normalizeEvidence(payload.evidence),
        linkedEntities: normalizeLinkedEntities(payload.linkedEntities),
        actions: normalizeActions(payload.actions),
        assignedReviewerId: payload.assignedReviewerId || null,
        latestReviewNote: note,
        lastReviewedAt: note ? now : null,
        lastReviewedBy: note ? getId(actor) : null,
        actionLog: [createActionLogEntry({
            action: FRAUD_ACTION_TYPES.CREATE_CASE,
            note: note || `Fraud case created with ${assessment.severity} severity`,
            actor,
            now
        })],
        createdBy: getId(actor),
        updatedBy: getId(actor)
    };
};

const normalizeUpdatePayload = (existingCase, payload = {}, { action, actor, now }) => {
    const nextSignals = payload.signals
        ? normalizeSignals({ ...existingCase.signals, ...payload.signals })
        : normalizeSignals(existingCase.signals);
    const assessment = buildFraudAssessment({
        caseType: payload.caseType || existingCase.caseType,
        riskScore: payload.riskScore ?? (payload.signals ? undefined : existingCase.riskScore),
        confidenceScore: payload.confidenceScore ?? existingCase.confidenceScore,
        severity: payload.severity,
        status: payload.status || existingCase.status,
        signals: nextSignals
    });
    const note = trimToNull(payload.note);
    const shouldRefreshAssessment = Boolean(
        payload.signals
        || payload.riskScore !== undefined
        || payload.confidenceScore !== undefined
        || payload.severity !== undefined
    );

    return {
        ...(payload.subjectLabel !== undefined ? { subjectLabel: trimToNull(payload.subjectLabel) } : {}),
        ...(payload.caseType !== undefined ? { caseType: payload.caseType } : {}),
        ...(payload.source !== undefined ? { source: payload.source } : {}),
        ...(shouldRefreshAssessment ? {
            riskScore: assessment.riskScore,
            confidenceScore: assessment.confidenceScore,
            severity: assessment.severity
        } : {}),
        ...(payload.status !== undefined ? { status: assessment.status } : {}),
        ...(payload.signals !== undefined ? { signals: assessment.signals } : {}),
        ...(payload.evidence !== undefined ? { evidence: normalizeEvidence(payload.evidence) } : {}),
        ...(payload.linkedEntities !== undefined ? {
            linkedEntities: normalizeLinkedEntities({
                ...existingCase.linkedEntities,
                ...payload.linkedEntities
            })
        } : {}),
        ...(payload.actions !== undefined ? {
            actions: normalizeActions({
                ...existingCase.actions,
                ...payload.actions
            })
        } : {}),
        ...(payload.assignedReviewerId !== undefined ? { assignedReviewerId: payload.assignedReviewerId || null } : {}),
        ...(note ? { latestReviewNote: note } : {}),
        lastReviewedAt: now,
        lastReviewedBy: getId(actor),
        updatedBy: getId(actor),
        actionLog: appendActionLog(existingCase, {
            action,
            note: note || 'Fraud case updated',
            actor,
            now
        })
    };
};

const buildFraudAssessment = ({
    caseType,
    riskScore,
    confidenceScore,
    severity,
    status,
    signals
} = {}) => buildCoreFraudAssessment({
    caseType,
    riskScore,
    confidenceScore,
    severity,
    status,
    signals
});

const normalizeFraudCase = (fraudCase) => {
    if (!fraudCase) {
        return null;
    }

    return {
        ...fraudCase,
        subjectType: fraudCase.subjectType || FRAUD_SUBJECT_TYPES.RIDER,
        caseType: fraudCase.caseType || FRAUD_CASE_TYPES.SUSPICIOUS_RIDE,
        source: fraudCase.source || FRAUD_CASE_SOURCES.SYSTEM,
        severity: fraudCase.severity || resolveSeverity(fraudCase.riskScore || 0),
        status: fraudCase.status || FRAUD_CASE_STATUSES.OPEN,
        riskScore: clampScore(fraudCase.riskScore || 0),
        confidenceScore: clampScore(fraudCase.confidenceScore ?? 50),
        signals: normalizeSignals(fraudCase.signals),
        evidence: normalizeEvidence(fraudCase.evidence),
        linkedEntities: normalizeLinkedEntities(fraudCase.linkedEntities),
        actions: normalizeActions(fraudCase.actions),
        resolution: normalizeResolution(fraudCase.resolution),
        actionLog: Array.isArray(fraudCase.actionLog) ? fraudCase.actionLog : []
    };
};

const normalizeSignals = (signals = {}) => normalizeFraudSignals(signals);

const normalizeEvidence = (evidence = []) => normalizeFraudEvidence(evidence);

const normalizeLinkedEntities = (linkedEntities = {}) => ({
    rideId: trimToNull(linkedEntities.rideId),
    paymentId: trimToNull(linkedEntities.paymentId),
    promoCode: trimToNull(linkedEntities.promoCode),
    deviceId: trimToNull(linkedEntities.deviceId),
    ipAddress: trimToNull(linkedEntities.ipAddress)
});

const normalizeActions = (actions = {}) => normalizeFraudActions(actions);

const normalizeResolution = (resolution = {}) => ({
    decision: resolution.decision || null,
    note: trimToNull(resolution.note),
    resolvedAt: resolution.resolvedAt || null,
    resolvedBy: resolution.resolvedBy || null
});

const resolveSeverity = (riskScore) => resolveFraudSeverity(riskScore);

const recommendedActionsFor = (fraudCase = {}) => recommendedFraudActionsFor(fraudCase);

const buildAssessmentGuidance = (assessment = {}) => buildCoreFraudGuidance(assessment);

const resolveDefaultDecision = (status) => (
    status === FRAUD_CASE_STATUSES.CONFIRMED
        ? FRAUD_RESOLUTION_DECISIONS.CONFIRMED_FRAUD
        : FRAUD_RESOLUTION_DECISIONS.MITIGATED
);

const assertCaseActionable = (fraudCase = {}, message) => {
    if (![
        FRAUD_CASE_STATUSES.OPEN,
        FRAUD_CASE_STATUSES.UNDER_REVIEW
    ].includes(fraudCase.status)) {
        throw AppError.badRequest(message);
    }
};

const assertCaseNotClosed = (fraudCase = {}, message) => {
    if ([
        FRAUD_CASE_STATUSES.DISMISSED,
        FRAUD_CASE_STATUSES.RESOLVED
    ].includes(fraudCase.status)) {
        throw AppError.badRequest(message);
    }
};

const appendActionLog = (fraudCase = {}, { action, note, actor, now }) => [
    ...(Array.isArray(fraudCase.actionLog) ? fraudCase.actionLog : []).slice(-(FRAUD_ACTION_LOG_LIMIT - 1)),
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

const createFraudCaseCode = (caseType, subjectType, subjectId, date) => {
    const compactTimestamp = date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const normalizedSubject = subjectId.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 16).toUpperCase();

    return `FRAUD-${caseType.toUpperCase()}-${subjectType.toUpperCase()}-${normalizedSubject || 'SUBJECT'}-${compactTimestamp}`;
};

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));

const trimToNull = (value) => {
    if (typeof value !== 'string') {
        return value || null;
    }

    return value.trim() || null;
};

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const toPlainArray = (documents = []) => documents.map((document) => toPlainObject(document));

const getId = (document = {}) => document._id?.toString?.() || document.id || null;
