import {
    DISPUTE_EVIDENCE_TYPES,
    DISPUTE_OPEN_STATUSES,
    DISPUTE_PRIORITIES,
    DISPUTE_REQUESTED_RESOLUTIONS,
    DISPUTE_RESOLUTION_TYPES,
    DISPUTE_STATUSES,
    DISPUTE_TYPE_CATALOG,
    DISPUTE_TYPES
} from '../../../public/disputes/disputes.constants.js';
import { PRIVATE_DISPUTE_ACTIONS } from '../disputes.constants.js';

export const toPrivateDisputeOptions = () => ({
    types: DISPUTE_TYPE_CATALOG,
    statuses: Object.values(DISPUTE_STATUSES),
    priorities: Object.values(DISPUTE_PRIORITIES),
    evidenceTypes: Object.values(DISPUTE_EVIDENCE_TYPES),
    requestedResolutions: Object.values(DISPUTE_REQUESTED_RESOLUTIONS),
    resolutionTypes: Object.values(DISPUTE_RESOLUTION_TYPES),
    actions: Object.values(PRIVATE_DISPUTE_ACTIONS)
});

export const toPrivateDisputeDashboard = (disputes = []) => ({
    summary: toPrivateDisputeSummary(disputes),
    urgentQueue: disputes
        .filter((dispute) => dispute.priority === DISPUTE_PRIORITIES.URGENT)
        .map(toPrivateDisputeQueueItem),
    openQueue: disputes
        .filter((dispute) => DISPUTE_OPEN_STATUSES.includes(dispute.status))
        .map(toPrivateDisputeQueueItem),
    recentActivity: [...disputes]
        .sort((left, right) => new Date(right.latestActivityAt || 0).getTime() - new Date(left.latestActivityAt || 0).getTime())
        .slice(0, 8)
        .map(toPrivateDisputeQueueItem)
});

export const toPrivateDisputeQueue = (disputes = []) => ({
    disputes: disputes.map(toPrivateDisputeQueueItem),
    summary: toPrivateDisputeSummary(disputes)
});

export const toPrivateDisputeQueueItem = (dispute = {}) => ({
    id: getId(dispute),
    disputeCode: dispute.disputeCode || null,
    rideId: toId(dispute.rideId),
    bookingCode: dispute.rideSnapshot?.bookingCode || null,
    type: dispute.type || null,
    reason: dispute.reason || null,
    status: dispute.status || DISPUTE_STATUSES.SUBMITTED,
    priority: dispute.priority || DISPUTE_PRIORITIES.LOW,
    title: dispute.title || null,
    requestedResolution: dispute.requestedResolution || null,
    requestedRefundAmount: nullableNumber(dispute.requestedRefundAmount),
    currency: dispute.currency || 'INR',
    evidenceCount: Array.isArray(dispute.evidence) ? dispute.evidence.length : 0,
    rider: {
        authUserId: toId(dispute.authUserId),
        role: dispute.role || null
    },
    ride: toRideSnapshot(dispute.rideSnapshot),
    timeline: toTimeline(dispute.timeline),
    ops: toOpsState(dispute.ops),
    latestActivityAt: dispute.latestActivityAt || null,
    guidance: toDisputeGuidance(dispute)
});

export const toPrivateDisputeDetail = (dispute = {}) => ({
    ...toPrivateDisputeQueueItem(dispute),
    description: dispute.description || null,
    evidence: toEvidence(dispute.evidence),
    resolution: toResolution(dispute.resolution),
    trustSignals: toTrustSignals(dispute.trustSignals),
    ops: toOpsState(dispute.ops, true),
    createdAt: dispute.createdAt || null,
    updatedAt: dispute.updatedAt || null
});

const toPrivateDisputeSummary = (disputes = []) => ({
    totalDisputes: disputes.length,
    submittedCount: countByStatus(disputes, DISPUTE_STATUSES.SUBMITTED),
    underReviewCount: countByStatus(disputes, DISPUTE_STATUSES.UNDER_REVIEW),
    evidenceRequestedCount: countByStatus(disputes, DISPUTE_STATUSES.EVIDENCE_REQUESTED),
    resolvedCount: countByStatus(disputes, DISPUTE_STATUSES.RESOLVED),
    rejectedCount: countByStatus(disputes, DISPUTE_STATUSES.REJECTED),
    cancelledCount: countByStatus(disputes, DISPUTE_STATUSES.CANCELLED),
    openCount: disputes.filter((dispute) => DISPUTE_OPEN_STATUSES.includes(dispute.status)).length,
    urgentCount: countByPriority(disputes, DISPUTE_PRIORITIES.URGENT),
    highPriorityCount: countByPriority(disputes, DISPUTE_PRIORITIES.HIGH),
    unassignedCount: disputes.filter((dispute) => !dispute.ops?.assignedOpsUserId).length,
    requestedRefundAmount: sumRequestedRefund(disputes),
    byType: countByEnum(disputes, 'type', Object.values(DISPUTE_TYPES)),
    byStatus: countByEnum(disputes, 'status', Object.values(DISPUTE_STATUSES))
});

const toRideSnapshot = (ride = {}) => ({
    bookingCode: ride?.bookingCode || null,
    pickup: toLocation(ride?.pickup),
    dropoff: toLocation(ride?.dropoff),
    vehicleType: ride?.vehicleType || null,
    driver: {
        driverId: ride?.driver?.driverId || null,
        fullName: ride?.driver?.fullName || null,
        vehicleName: ride?.driver?.vehicleName || null,
        vehicleNumber: ride?.driver?.vehicleNumber || null
    }
});

const toLocation = (location = {}) => ({
    address: location?.address || null,
    latitude: numberOrZero(location?.latitude),
    longitude: numberOrZero(location?.longitude)
});

const toEvidence = (evidence = []) => (Array.isArray(evidence) ? evidence : []).map((item) => ({
    type: item.type,
    label: item.label || null,
    url: item.url || null,
    note: item.note || null,
    submittedAt: item.submittedAt || null,
    capturedAt: item.capturedAt || null
}));

const toResolution = (resolution = null) => resolution ? {
    type: resolution.type || null,
    note: resolution.note || null,
    refundAmount: nullableNumber(resolution.refundAmount),
    resolvedAt: resolution.resolvedAt || null
} : null;

const toTrustSignals = (signals = {}) => ({
    driverTrustScore: nullableNumber(signals?.driverTrustScore),
    routeAccuracyScore: nullableNumber(signals?.routeAccuracyScore),
    fairPriceScore: nullableNumber(signals?.fairPriceScore),
    cancellationRiskLevel: signals?.cancellationRiskLevel || null
});

const toTimeline = (timeline = {}) => ({
    submittedAt: timeline?.submittedAt || null,
    acknowledgedAt: timeline?.acknowledgedAt || null,
    evidenceRequestedAt: timeline?.evidenceRequestedAt || null,
    resolvedAt: timeline?.resolvedAt || null,
    cancelledAt: timeline?.cancelledAt || null
});

const toOpsState = (ops = {}, includeLog = false) => ({
    assignedOpsUserId: toId(ops.assignedOpsUserId),
    lastAction: ops.lastAction || null,
    lastActionNote: ops.lastActionNote || null,
    lastActionAt: ops.lastActionAt || null,
    lastActionBy: toId(ops.lastActionBy),
    ...(includeLog ? { actionLog: toActionLog(ops.actionLog) } : {})
});

const toActionLog = (actionLog = []) => (Array.isArray(actionLog) ? actionLog : []).map((entry) => ({
    action: entry.action || null,
    note: entry.note || null,
    actorId: toId(entry.actorId),
    actorRole: entry.actorRole || null,
    createdAt: entry.createdAt || null
}));

const toDisputeGuidance = (dispute = {}) => ({
    canAssign: DISPUTE_OPEN_STATUSES.includes(dispute.status),
    canRequestEvidence: [
        DISPUTE_STATUSES.SUBMITTED,
        DISPUTE_STATUSES.UNDER_REVIEW
    ].includes(dispute.status),
    canResolve: DISPUTE_OPEN_STATUSES.includes(dispute.status),
    canReject: DISPUTE_OPEN_STATUSES.includes(dispute.status),
    nextAction: resolveNextAction(dispute)
});

const resolveNextAction = (dispute = {}) => {
    if (dispute.status === DISPUTE_STATUSES.EVIDENCE_REQUESTED) {
        return 'Wait for user evidence or follow up';
    }

    if (dispute.status === DISPUTE_STATUSES.SUBMITTED) {
        return 'Assign owner and acknowledge the dispute';
    }

    if (dispute.status === DISPUTE_STATUSES.UNDER_REVIEW) {
        return 'Review evidence and resolve or reject';
    }

    if (dispute.status === DISPUTE_STATUSES.RESOLVED) {
        return 'No action needed';
    }

    if (dispute.status === DISPUTE_STATUSES.REJECTED) {
        return 'No action needed';
    }

    return 'Review dispute state';
};

const countByStatus = (disputes = [], status) => disputes.filter((dispute) => dispute.status === status).length;

const countByPriority = (disputes = [], priority) => disputes.filter((dispute) => dispute.priority === priority).length;

const countByEnum = (disputes = [], field, keys = []) => keys.reduce((result, key) => ({
    ...result,
    [key]: disputes.filter((dispute) => dispute[field] === key).length
}), {});

const sumRequestedRefund = (disputes = []) => Number(
    disputes.reduce((sum, dispute) => sum + numberOrZero(dispute.requestedRefundAmount), 0).toFixed(2)
);

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const toId = (value) => value?._id?.toString?.() || value?.toString?.() || value || null;

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;

const nullableNumber = (value) => Number.isFinite(value) ? value : null;
