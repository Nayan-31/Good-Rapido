import {
    FRAUD_CASE_SOURCES,
    FRAUD_CASE_STATUSES,
    FRAUD_CASE_TYPES,
    FRAUD_EVIDENCE_TYPES,
    FRAUD_RESOLUTION_DECISIONS,
    FRAUD_RISK_SCORE_BANDS,
    FRAUD_SEVERITY_LEVELS,
    FRAUD_SUBJECT_TYPES
} from '../fraud.constants.js';

export const toFraudOptions = () => ({
    subjectTypes: Object.values(FRAUD_SUBJECT_TYPES),
    caseTypes: Object.values(FRAUD_CASE_TYPES),
    sources: Object.values(FRAUD_CASE_SOURCES),
    severities: Object.values(FRAUD_SEVERITY_LEVELS),
    statuses: Object.values(FRAUD_CASE_STATUSES),
    resolutionDecisions: Object.values(FRAUD_RESOLUTION_DECISIONS),
    evidenceTypes: Object.values(FRAUD_EVIDENCE_TYPES),
    riskScoreBands: FRAUD_RISK_SCORE_BANDS,
    signalFields: [
        'promoAbuseScore',
        'paymentRiskScore',
        'gpsMismatchScore',
        'deviceReuseScore',
        'cancellationAbuseScore',
        'disputePatternScore',
        'velocityScore'
    ]
});

export const toFraudDashboard = (cases = []) => ({
    summary: toFraudSummary(cases),
    highRiskCases: cases
        .filter((fraudCase) => [
            FRAUD_SEVERITY_LEVELS.HIGH,
            FRAUD_SEVERITY_LEVELS.CRITICAL
        ].includes(fraudCase.severity))
        .map(toFraudCaseListItem),
    openCases: cases
        .filter((fraudCase) => [
            FRAUD_CASE_STATUSES.OPEN,
            FRAUD_CASE_STATUSES.UNDER_REVIEW
        ].includes(fraudCase.status))
        .map(toFraudCaseListItem),
    recentCases: [...cases]
        .sort((left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime())
        .slice(0, 8)
        .map(toFraudCaseListItem)
});

export const toFraudCaseList = (cases = []) => ({
    cases: cases.map(toFraudCaseListItem),
    summary: toFraudSummary(cases)
});

export const toFraudCaseListItem = (fraudCase = {}) => ({
    id: getId(fraudCase),
    caseCode: fraudCase.caseCode || null,
    subjectType: fraudCase.subjectType || null,
    subjectId: fraudCase.subjectId || null,
    subjectLabel: fraudCase.subjectLabel || null,
    caseType: fraudCase.caseType || null,
    source: fraudCase.source || FRAUD_CASE_SOURCES.SYSTEM,
    severity: fraudCase.severity || FRAUD_SEVERITY_LEVELS.LOW,
    status: fraudCase.status || FRAUD_CASE_STATUSES.OPEN,
    riskScore: numberOrZero(fraudCase.riskScore),
    confidenceScore: numberOrZero(fraudCase.confidenceScore),
    assignedReviewerId: toId(fraudCase.assignedReviewerId),
    latestReviewNote: fraudCase.latestReviewNote || null,
    lastReviewedAt: fraudCase.lastReviewedAt || null,
    updatedAt: fraudCase.updatedAt || null,
    guidance: toFraudGuidance(fraudCase)
});

export const toFraudCase = (fraudCase = {}) => ({
    ...toFraudCaseListItem(fraudCase),
    signals: toFraudSignals(fraudCase.signals),
    evidence: toFraudEvidence(fraudCase.evidence),
    linkedEntities: toLinkedEntities(fraudCase.linkedEntities),
    actions: toFraudActions(fraudCase.actions),
    resolution: toFraudResolution(fraudCase.resolution),
    lastReviewedBy: toId(fraudCase.lastReviewedBy),
    actionLog: toFraudActionLog(fraudCase.actionLog),
    createdBy: toId(fraudCase.createdBy),
    updatedBy: toId(fraudCase.updatedBy),
    createdAt: fraudCase.createdAt || null
});

export const toFraudScoreSimulation = ({ riskScore, confidenceScore, severity, status, signals, actions, guidance }) => ({
    riskScore,
    confidenceScore,
    severity,
    status,
    signals: toFraudSignals(signals),
    actions: toFraudActions(actions),
    guidance
});

const toFraudSummary = (cases = []) => ({
    totalCases: cases.length,
    openCases: countByStatus(cases, FRAUD_CASE_STATUSES.OPEN),
    underReviewCases: countByStatus(cases, FRAUD_CASE_STATUSES.UNDER_REVIEW),
    confirmedCases: countByStatus(cases, FRAUD_CASE_STATUSES.CONFIRMED),
    dismissedCases: countByStatus(cases, FRAUD_CASE_STATUSES.DISMISSED),
    resolvedCases: countByStatus(cases, FRAUD_CASE_STATUSES.RESOLVED),
    highRiskCases: countBySeverity(cases, FRAUD_SEVERITY_LEVELS.HIGH),
    criticalRiskCases: countBySeverity(cases, FRAUD_SEVERITY_LEVELS.CRITICAL),
    averageRiskScore: averageRiskScore(cases)
});

const toFraudSignals = (signals = {}) => ({
    promoAbuseScore: numberOrZero(signals.promoAbuseScore),
    paymentRiskScore: numberOrZero(signals.paymentRiskScore),
    gpsMismatchScore: numberOrZero(signals.gpsMismatchScore),
    deviceReuseScore: numberOrZero(signals.deviceReuseScore),
    cancellationAbuseScore: numberOrZero(signals.cancellationAbuseScore),
    disputePatternScore: numberOrZero(signals.disputePatternScore),
    velocityScore: numberOrZero(signals.velocityScore)
});

const toFraudEvidence = (evidence = []) => evidence.map((item) => ({
    type: item.type,
    label: item.label || null,
    url: item.url || null,
    note: item.note || null,
    capturedAt: item.capturedAt || null
}));

const toLinkedEntities = (linkedEntities = {}) => ({
    rideId: linkedEntities.rideId || null,
    paymentId: linkedEntities.paymentId || null,
    promoCode: linkedEntities.promoCode || null,
    deviceId: linkedEntities.deviceId || null,
    ipAddress: linkedEntities.ipAddress || null
});

const toFraudActions = (actions = {}) => ({
    accountBlocked: Boolean(actions.accountBlocked),
    payoutHeld: Boolean(actions.payoutHeld),
    promoDisabled: Boolean(actions.promoDisabled),
    rideBookingBlocked: Boolean(actions.rideBookingBlocked),
    reason: actions.reason || null,
    expiresAt: actions.expiresAt || null
});

const toFraudResolution = (resolution = {}) => ({
    decision: resolution.decision || null,
    note: resolution.note || null,
    resolvedAt: resolution.resolvedAt || null,
    resolvedBy: toId(resolution.resolvedBy)
});

const toFraudActionLog = (actionLog = []) => actionLog.map((entry) => ({
    action: entry.action,
    note: entry.note || null,
    actorId: toId(entry.actorId),
    actorRole: entry.actorRole || null,
    createdAt: entry.createdAt || null
}));

const toFraudGuidance = (fraudCase = {}) => ({
    canAssign: [
        FRAUD_CASE_STATUSES.OPEN,
        FRAUD_CASE_STATUSES.UNDER_REVIEW
    ].includes(fraudCase.status),
    canConfirm: [
        FRAUD_CASE_STATUSES.OPEN,
        FRAUD_CASE_STATUSES.UNDER_REVIEW
    ].includes(fraudCase.status),
    canDismiss: [
        FRAUD_CASE_STATUSES.OPEN,
        FRAUD_CASE_STATUSES.UNDER_REVIEW
    ].includes(fraudCase.status),
    canResolve: [
        FRAUD_CASE_STATUSES.OPEN,
        FRAUD_CASE_STATUSES.UNDER_REVIEW,
        FRAUD_CASE_STATUSES.CONFIRMED
    ].includes(fraudCase.status),
    shouldBlockAccount: Boolean(fraudCase.actions?.accountBlocked) || fraudCase.severity === FRAUD_SEVERITY_LEVELS.CRITICAL,
    shouldHoldPayout: Boolean(fraudCase.actions?.payoutHeld),
    nextAction: resolveNextAction(fraudCase)
});

const resolveNextAction = (fraudCase = {}) => {
    if (fraudCase.status === FRAUD_CASE_STATUSES.RESOLVED) {
        return 'No action needed';
    }

    if (fraudCase.status === FRAUD_CASE_STATUSES.DISMISSED) {
        return 'No fraud action needed';
    }

    if (fraudCase.status === FRAUD_CASE_STATUSES.CONFIRMED) {
        return 'Apply mitigation and resolve the case';
    }

    if (fraudCase.severity === FRAUD_SEVERITY_LEVELS.CRITICAL) {
        return 'Escalate and apply immediate controls';
    }

    if (fraudCase.severity === FRAUD_SEVERITY_LEVELS.HIGH) {
        return 'Assign reviewer and verify linked evidence';
    }

    return 'Monitor case signals and add review notes';
};

const countByStatus = (cases = [], status) => cases.filter((fraudCase) => fraudCase.status === status).length;

const countBySeverity = (cases = [], severity) => cases.filter((fraudCase) => fraudCase.severity === severity).length;

const averageRiskScore = (cases = []) => {
    if (!cases.length) {
        return 0;
    }

    const totalScore = cases.reduce((sum, fraudCase) => sum + numberOrZero(fraudCase.riskScore), 0);

    return Number((totalScore / cases.length).toFixed(2));
};

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const toId = (value) => value?._id?.toString?.() || value?.toString?.() || value || null;
