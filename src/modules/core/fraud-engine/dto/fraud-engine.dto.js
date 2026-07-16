import {
    FRAUD_ENGINE_ASSESSMENT_SOURCES,
    FRAUD_ENGINE_CASE_SOURCES,
    FRAUD_ENGINE_CASE_STATUSES,
    FRAUD_ENGINE_CASE_TYPE_BOOSTS,
    FRAUD_ENGINE_CASE_TYPES,
    FRAUD_ENGINE_EVIDENCE_TYPES,
    FRAUD_ENGINE_RISK_SCORE_BANDS,
    FRAUD_ENGINE_SEVERITY_LEVELS,
    FRAUD_ENGINE_SIGNAL_FIELDS,
    FRAUD_ENGINE_SUBJECT_TYPES
} from '../fraud-engine.constants.js';

export const toFraudEngineOptions = () => ({
    subjectTypes: Object.values(FRAUD_ENGINE_SUBJECT_TYPES),
    caseTypes: Object.values(FRAUD_ENGINE_CASE_TYPES),
    sources: Object.values(FRAUD_ENGINE_CASE_SOURCES),
    severities: Object.values(FRAUD_ENGINE_SEVERITY_LEVELS),
    statuses: Object.values(FRAUD_ENGINE_CASE_STATUSES),
    evidenceTypes: Object.values(FRAUD_ENGINE_EVIDENCE_TYPES),
    assessmentSources: Object.values(FRAUD_ENGINE_ASSESSMENT_SOURCES),
    signalFields: FRAUD_ENGINE_SIGNAL_FIELDS,
    riskScoreBands: FRAUD_ENGINE_RISK_SCORE_BANDS,
    caseTypeBoosts: FRAUD_ENGINE_CASE_TYPE_BOOSTS
});

export const toFraudEngineAssessment = (assessment = {}) => ({
    source: assessment.source || FRAUD_ENGINE_ASSESSMENT_SOURCES.SIGNALS,
    subjectType: assessment.subjectType || FRAUD_ENGINE_SUBJECT_TYPES.RIDER,
    caseType: assessment.caseType || FRAUD_ENGINE_CASE_TYPES.SUSPICIOUS_RIDE,
    riskScore: numberOrZero(assessment.riskScore),
    confidenceScore: numberOrZero(assessment.confidenceScore),
    severity: assessment.severity || FRAUD_ENGINE_SEVERITY_LEVELS.LOW,
    status: assessment.status || FRAUD_ENGINE_CASE_STATUSES.OPEN,
    signals: toFraudSignals(assessment.signals),
    actions: toFraudActions(assessment.actions),
    guidance: toFraudGuidance(assessment.guidance)
});

const toFraudSignals = (signals = {}) => FRAUD_ENGINE_SIGNAL_FIELDS.reduce((normalized, field) => ({
    ...normalized,
    [field]: numberOrZero(signals[field])
}), {});

const toFraudActions = (actions = {}) => ({
    accountBlocked: Boolean(actions.accountBlocked),
    payoutHeld: Boolean(actions.payoutHeld),
    promoDisabled: Boolean(actions.promoDisabled),
    rideBookingBlocked: Boolean(actions.rideBookingBlocked),
    reason: actions.reason || null,
    expiresAt: actions.expiresAt || null
});

const toFraudGuidance = (guidance = {}) => ({
    shouldEscalate: Boolean(guidance.shouldEscalate),
    suggestedStatus: guidance.suggestedStatus || null,
    suggestedSeverity: guidance.suggestedSeverity || null,
    shouldBlockAccount: Boolean(guidance.shouldBlockAccount),
    shouldHoldPayout: Boolean(guidance.shouldHoldPayout),
    shouldDisablePromo: Boolean(guidance.shouldDisablePromo),
    shouldBlockBooking: Boolean(guidance.shouldBlockBooking),
    nextAction: guidance.nextAction || null
});

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;
