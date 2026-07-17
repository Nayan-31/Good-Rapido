import {
    FRAUD_ENGINE_ASSESSMENT_SOURCES,
    FRAUD_ENGINE_CASE_STATUSES,
    FRAUD_ENGINE_CASE_TYPE_BOOSTS,
    FRAUD_ENGINE_CASE_TYPES,
    FRAUD_ENGINE_DEFAULT_MANUAL_CONFIDENCE_SCORE,
    FRAUD_ENGINE_SEVERITY_LEVELS,
    FRAUD_ENGINE_SIGNAL_FIELDS,
    FRAUD_ENGINE_SUBJECT_TYPES
} from './fraud-engine.constants.js';

export const buildFraudAssessment = ({
    subjectType,
    caseType,
    riskScore,
    confidenceScore,
    severity,
    status,
    signals
} = {}) => {
    const normalizedSignals = normalizeFraudSignals(signals);
    const hasManualRiskScore = riskScore !== undefined && riskScore !== null;
    const normalizedRiskScore = clampScore(
        hasManualRiskScore ? riskScore : resolveFraudRiskScore(normalizedSignals, caseType)
    );
    const normalizedSeverity = severity || resolveFraudSeverity(normalizedRiskScore);

    return {
        source: hasManualRiskScore
            ? FRAUD_ENGINE_ASSESSMENT_SOURCES.MANUAL_RISK_SCORE
            : FRAUD_ENGINE_ASSESSMENT_SOURCES.SIGNALS,
        subjectType: subjectType || FRAUD_ENGINE_SUBJECT_TYPES.RIDER,
        caseType: caseType || FRAUD_ENGINE_CASE_TYPES.SUSPICIOUS_RIDE,
        riskScore: normalizedRiskScore,
        confidenceScore: clampScore(
            confidenceScore ?? resolveFraudConfidenceScore(normalizedSignals, hasManualRiskScore)
        ),
        severity: normalizedSeverity,
        status: status || FRAUD_ENGINE_CASE_STATUSES.OPEN,
        signals: normalizedSignals
    };
};

export const normalizeFraudSignals = (signals = {}) => FRAUD_ENGINE_SIGNAL_FIELDS.reduce((normalized, field) => ({
    ...normalized,
    [field]: clampScore(signals[field] || 0)
}), {});

export const normalizeFraudEvidence = (evidence = []) => (
    Array.isArray(evidence)
        ? evidence.map((item) => ({
            type: item.type,
            label: trimToNull(item.label),
            url: trimToNull(item.url),
            note: trimToNull(item.note),
            capturedAt: item.capturedAt || null
        }))
        : []
);

export const normalizeFraudActions = (actions = {}) => ({
    accountBlocked: Boolean(actions.accountBlocked),
    payoutHeld: Boolean(actions.payoutHeld),
    promoDisabled: Boolean(actions.promoDisabled),
    rideBookingBlocked: Boolean(actions.rideBookingBlocked),
    reason: trimToNull(actions.reason),
    expiresAt: actions.expiresAt || null
});

export const resolveFraudRiskScore = (signals = {}, caseType) => {
    const normalizedSignals = normalizeFraudSignals(signals);
    const values = Object.values(normalizedSignals);
    const highestSignal = values.length ? Math.max(...values) : 0;
    const averageSignal = values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : 0;
    const caseTypeBoost = resolveFraudCaseTypeBoost(caseType);

    return clampScore(highestSignal * 0.6 + averageSignal * 0.4 + caseTypeBoost);
};

export const resolveFraudConfidenceScore = (signals = {}, hasManualRiskScore = false) => {
    if (hasManualRiskScore) {
        return FRAUD_ENGINE_DEFAULT_MANUAL_CONFIDENCE_SCORE;
    }

    const positiveSignals = Object.values(normalizeFraudSignals(signals)).filter((score) => score > 0).length;

    return clampScore(35 + positiveSignals * 10);
};

export const resolveFraudCaseTypeBoost = (caseType) => FRAUD_ENGINE_CASE_TYPE_BOOSTS[caseType] || 0;

export const resolveFraudSeverity = (riskScore) => {
    if (riskScore >= 80) {
        return FRAUD_ENGINE_SEVERITY_LEVELS.CRITICAL;
    }

    if (riskScore >= 60) {
        return FRAUD_ENGINE_SEVERITY_LEVELS.HIGH;
    }

    if (riskScore >= 40) {
        return FRAUD_ENGINE_SEVERITY_LEVELS.MEDIUM;
    }

    return FRAUD_ENGINE_SEVERITY_LEVELS.LOW;
};

export const recommendedFraudActionsFor = (fraudCase = {}) => {
    const severity = fraudCase.severity || resolveFraudSeverity(fraudCase.riskScore || 0);
    const caseType = fraudCase.caseType;

    return normalizeFraudActions({
        accountBlocked: severity === FRAUD_ENGINE_SEVERITY_LEVELS.CRITICAL,
        rideBookingBlocked: [
            FRAUD_ENGINE_SEVERITY_LEVELS.HIGH,
            FRAUD_ENGINE_SEVERITY_LEVELS.CRITICAL
        ].includes(severity),
        payoutHeld: [
            FRAUD_ENGINE_CASE_TYPES.PAYMENT_RISK,
            FRAUD_ENGINE_CASE_TYPES.CHARGEBACK,
            FRAUD_ENGINE_CASE_TYPES.COLLUSION
        ].includes(caseType) || (
            fraudCase.subjectType === FRAUD_ENGINE_SUBJECT_TYPES.DRIVER
            && severity === FRAUD_ENGINE_SEVERITY_LEVELS.CRITICAL
        ),
        promoDisabled: caseType === FRAUD_ENGINE_CASE_TYPES.PROMO_ABUSE,
        reason: resolveFraudActionReason({ ...fraudCase, severity })
    });
};

export const buildFraudGuidance = (assessment = {}) => {
    const severity = assessment.severity || resolveFraudSeverity(assessment.riskScore || 0);
    const actions = recommendedFraudActionsFor({ ...assessment, severity });

    return {
        shouldEscalate: [
            FRAUD_ENGINE_SEVERITY_LEVELS.HIGH,
            FRAUD_ENGINE_SEVERITY_LEVELS.CRITICAL
        ].includes(severity),
        suggestedStatus: assessment.status || FRAUD_ENGINE_CASE_STATUSES.OPEN,
        suggestedSeverity: severity,
        shouldBlockAccount: actions.accountBlocked,
        shouldHoldPayout: actions.payoutHeld,
        shouldDisablePromo: actions.promoDisabled,
        shouldBlockBooking: actions.rideBookingBlocked,
        nextAction: severity === FRAUD_ENGINE_SEVERITY_LEVELS.CRITICAL
            ? 'Escalate and apply immediate controls'
            : severity === FRAUD_ENGINE_SEVERITY_LEVELS.HIGH
                ? 'Assign reviewer and verify evidence'
                : severity === FRAUD_ENGINE_SEVERITY_LEVELS.MEDIUM
                    ? 'Monitor signals and collect supporting evidence'
                    : 'Keep case open only if new signals arrive'
    };
};

const resolveFraudActionReason = (fraudCase = {}) => {
    if (fraudCase.severity === FRAUD_ENGINE_SEVERITY_LEVELS.CRITICAL) {
        return 'Critical fraud risk controls recommended';
    }

    if (fraudCase.severity === FRAUD_ENGINE_SEVERITY_LEVELS.HIGH) {
        return 'High fraud risk controls recommended';
    }

    return null;
};

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(Number.isFinite(Number(value)) ? Number(value) : 0)));

const trimToNull = (value) => {
    if (typeof value !== 'string') {
        return value || null;
    }

    return value.trim() || null;
};
