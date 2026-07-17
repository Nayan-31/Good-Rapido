import {
    DISPUTE_EVIDENCE_TYPES,
    DISPUTE_OPEN_STATUSES,
    DISPUTE_REASONS,
    DISPUTE_REQUESTED_RESOLUTIONS,
    DISPUTE_STATUSES,
    DISPUTE_TYPE_CATALOG,
    DISPUTE_TYPES
} from '../disputes.constants.js';

export const toPublicDisputeOptions = () => ({
    types: DISPUTE_TYPE_CATALOG,
    reasons: Object.values(DISPUTE_REASONS),
    evidenceTypes: Object.values(DISPUTE_EVIDENCE_TYPES),
    requestedResolutions: Object.values(DISPUTE_REQUESTED_RESOLUTIONS)
});

export const toPublicDispute = (dispute = {}) => ({
    id: getId(dispute),
    disputeCode: dispute.disputeCode,
    rideId: getRideId(dispute),
    ride: toPublicRideSnapshot(dispute.rideSnapshot),
    type: dispute.type,
    reason: dispute.reason,
    status: dispute.status,
    priority: dispute.priority,
    title: dispute.title || null,
    description: dispute.description || null,
    requestedResolution: dispute.requestedResolution || null,
    requestedRefundAmount: nullableNumber(dispute.requestedRefundAmount),
    currency: dispute.currency || 'INR',
    evidence: toPublicEvidenceList(dispute.evidence),
    timeline: toPublicTimeline(dispute.timeline),
    resolution: toPublicResolution(dispute.resolution),
    trustSignals: toPublicTrustSignals(dispute.trustSignals),
    latestActivityAt: dispute.latestActivityAt || null,
    createdAt: dispute.createdAt || null,
    updatedAt: dispute.updatedAt || null
});

export const toPublicDisputeHistoryItem = (dispute = {}) => ({
    id: getId(dispute),
    disputeCode: dispute.disputeCode,
    rideId: getRideId(dispute),
    bookingCode: dispute.rideSnapshot?.bookingCode || null,
    type: dispute.type,
    reason: dispute.reason,
    status: dispute.status,
    priority: dispute.priority,
    title: dispute.title || null,
    requestedRefundAmount: nullableNumber(dispute.requestedRefundAmount),
    currency: dispute.currency || 'INR',
    evidenceCount: Array.isArray(dispute.evidence) ? dispute.evidence.length : 0,
    submittedAt: dispute.timeline?.submittedAt || null,
    resolvedAt: dispute.timeline?.resolvedAt || null,
    cancelledAt: dispute.timeline?.cancelledAt || null,
    latestActivityAt: dispute.latestActivityAt || dispute.updatedAt || null
});

export const toPublicDisputeEligibility = (eligibility = {}) => ({
    canDispute: Boolean(eligibility.canDispute),
    reason: eligibility.reason || null,
    completedAt: eligibility.completedAt || null,
    cancelledAt: eligibility.cancelledAt || null,
    activeDisputeCount: numberOrZero(eligibility.activeDisputeCount),
    recommendedTypes: Array.isArray(eligibility.recommendedTypes) ? eligibility.recommendedTypes : []
});

export const toPublicDisputeGuidance = (dispute = {}, typeProfile = {}) => ({
    status: dispute.status || null,
    isOpen: DISPUTE_OPEN_STATUSES.includes(dispute.status),
    expectedResponseBy: typeProfile.responseHours && dispute.timeline?.submittedAt
        ? addHours(new Date(dispute.timeline.submittedAt), typeProfile.responseHours)
        : null,
    nextAction: resolveNextAction(dispute),
    evidenceHelpful: resolveHelpfulEvidence(dispute.type)
});

export const toPublicDisputeSummary = (summary = {}) => ({
    totalDisputes: numberOrZero(summary.totalDisputes),
    openCount: numberOrZero(summary.openCount),
    resolvedCount: numberOrZero(summary.resolvedCount),
    cancelledCount: numberOrZero(summary.cancelledCount),
    urgentCount: numberOrZero(summary.urgentCount),
    byStatus: normalizeEnumCounts(summary.byStatus, Object.values(DISPUTE_STATUSES)),
    byType: normalizeEnumCounts(summary.byType, Object.values(DISPUTE_TYPES)),
    latestSubmittedAt: summary.latestSubmittedAt || null
});

const toPublicRideSnapshot = (ride = {}) => ({
    bookingCode: ride?.bookingCode || null,
    pickup: toPublicLocation(ride?.pickup),
    dropoff: toPublicLocation(ride?.dropoff),
    vehicleType: ride?.vehicleType || null,
    driver: {
        driverId: ride?.driver?.driverId || null,
        fullName: ride?.driver?.fullName || null,
        vehicleName: ride?.driver?.vehicleName || null,
        vehicleNumber: ride?.driver?.vehicleNumber || null
    }
});

const toPublicLocation = (location = {}) => ({
    address: location?.address || null,
    latitude: numberOrZero(location?.latitude),
    longitude: numberOrZero(location?.longitude)
});

const toPublicEvidenceList = (evidence = []) => Array.isArray(evidence)
    ? evidence.map((item) => ({
        type: item.type,
        label: item.label || null,
        url: item.url || null,
        note: item.note || null,
        submittedAt: item.submittedAt || null,
        capturedAt: item.capturedAt || null
    }))
    : [];

const toPublicTimeline = (timeline = {}) => ({
    submittedAt: timeline?.submittedAt || null,
    acknowledgedAt: timeline?.acknowledgedAt || null,
    evidenceRequestedAt: timeline?.evidenceRequestedAt || null,
    resolvedAt: timeline?.resolvedAt || null,
    cancelledAt: timeline?.cancelledAt || null
});

const toPublicResolution = (resolution = null) => resolution ? {
    type: resolution.type || null,
    note: resolution.note || null,
    refundAmount: nullableNumber(resolution.refundAmount),
    resolvedAt: resolution.resolvedAt || null
} : null;

const toPublicTrustSignals = (signals = {}) => ({
    driverTrustScore: nullableNumber(signals?.driverTrustScore),
    routeAccuracyScore: nullableNumber(signals?.routeAccuracyScore),
    fairPriceScore: nullableNumber(signals?.fairPriceScore),
    cancellationRiskLevel: signals?.cancellationRiskLevel || null
});

const normalizeEnumCounts = (counts = {}, keys = []) => keys.reduce((result, key) => ({
    ...result,
    [key]: numberOrZero(counts[key])
}), {});

const resolveNextAction = (dispute = {}) => {
    if (dispute.status === DISPUTE_STATUSES.EVIDENCE_REQUESTED) {
        return 'Add requested evidence for faster review';
    }

    if (DISPUTE_OPEN_STATUSES.includes(dispute.status)) {
        return 'Our support team will review the ride signals and evidence';
    }

    if (dispute.status === DISPUTE_STATUSES.RESOLVED) {
        return 'Review the resolution and refund details';
    }

    if (dispute.status === DISPUTE_STATUSES.CANCELLED) {
        return 'Dispute was cancelled by the user';
    }

    return 'No action required';
};

const resolveHelpfulEvidence = (type) => {
    if (type === DISPUTE_TYPES.WRONG_ROUTE) {
        return ['route screenshot', 'dropoff location note', 'driver conversation'];
    }

    if (type === DISPUTE_TYPES.FAKE_TRIP) {
        return ['location proof', 'ride receipt', 'driver conversation'];
    }

    if (type === DISPUTE_TYPES.PAYMENT_ISSUE) {
        return ['payment receipt', 'bank transaction screenshot'];
    }

    if (type === DISPUTE_TYPES.SAFETY_CONCERN) {
        return ['safety details', 'audio or image evidence if available'];
    }

    return ['receipt', 'screenshots', 'short note'];
};

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const getRideId = (dispute = {}) => dispute.rideId?._id?.toString?.()
    || dispute.rideId?.toString?.()
    || dispute.rideId
    || null;

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;

const nullableNumber = (value) => Number.isFinite(value) ? value : null;

const addHours = (date, hours) => new Date(date.getTime() + hours * 60 * 60 * 1000);
