import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import { RIDE_BOOKING_STATUSES } from '../ride-booking/ride-booking.constants.js';
import {
    DISPUTE_CURRENCY,
    DISPUTE_MAX_EVIDENCE_ITEMS,
    DISPUTE_OPEN_STATUSES,
    DISPUTE_PRIORITIES,
    DISPUTE_STATUSES,
    DISPUTE_TYPE_CATALOG,
    DISPUTE_TYPES
} from './disputes.constants.js';
import {
    toPublicDispute,
    toPublicDisputeEligibility,
    toPublicDisputeGuidance,
    toPublicDisputeHistoryItem,
    toPublicDisputeOptions,
    toPublicDisputeSummary
} from './dto/disputes.dto.js';

export default class DisputesService {
    constructor({ disputesDao, ridesDao, now = () => new Date() }) {
        this.disputesDao = disputesDao;
        this.ridesDao = ridesDao;
        this.now = now;
    }

    options(authContext) {
        this.assertAuthContext(authContext);

        return buildSuccessResponse({
            message: 'Dispute options fetched successfully',
            data: {
                options: toPublicDisputeOptions()
            }
        });
    }

    async summary(authContext) {
        const { userId, role } = this.assertAuthContext(authContext);
        const summary = await this.disputesDao.findSummaryForUser(userId, role);

        return buildSuccessResponse({
            message: 'Dispute summary fetched successfully',
            data: {
                summary: toPublicDisputeSummary(normalizeSummary(summary))
            }
        });
    }

    async history(authContext, query = {}) {
        const { userId, role } = this.assertAuthContext(authContext);
        const disputes = await this.disputesDao.findHistoryForUser(userId, role, query);
        const plainDisputes = disputes.map(toPlainObject);

        return buildSuccessResponse({
            message: 'Dispute history fetched successfully',
            data: {
                history: plainDisputes.map(toPublicDisputeHistoryItem),
                summary: toPublicDisputeSummary(buildSummaryFromDisputes(plainDisputes))
            }
        });
    }

    async getDispute(authContext, disputeId) {
        const dispute = await this.findDispute(authContext, disputeId);

        return buildSuccessResponse({
            message: 'Dispute fetched successfully',
            data: {
                dispute: toPublicDispute(dispute),
                guidance: toPublicDisputeGuidance(dispute, resolveTypeProfile(dispute.type))
            }
        });
    }

    async getRideDisputes(authContext, rideId) {
        const { userId, role } = this.assertAuthContext(authContext);
        const ride = await this.findRideForDispute(rideId, userId, role);
        const rideObject = toPlainObject(ride);
        const disputes = await this.disputesDao.findRideDisputesForUser(rideId, userId, role);
        const plainDisputes = disputes.map(toPlainObject);

        return buildSuccessResponse({
            message: 'Ride disputes fetched successfully',
            data: {
                disputes: plainDisputes.map(toPublicDisputeHistoryItem),
                eligibility: toPublicDisputeEligibility(this.buildEligibility(rideObject, plainDisputes))
            }
        });
    }

    async submitRideDispute(authContext, rideId, payload) {
        const { userId, role } = this.assertAuthContext(authContext);
        const ride = await this.findRideForDispute(rideId, userId, role);
        const rideObject = toPlainObject(ride);

        if (!this.isDisputableRide(rideObject)) {
            throw AppError.badRequest('Only completed or cancelled rides can be disputed');
        }

        const existingDispute = await this.disputesDao.findActiveByRideAndTypeForUser(
            rideId,
            userId,
            role,
            payload.type
        );

        if (existingDispute) {
            throw AppError.conflict('An active dispute already exists for this ride and type');
        }

        const submittedAt = this.now();
        const typeProfile = resolveTypeProfile(payload.type);
        const disputePayload = {
            disputeCode: createDisputeCode(submittedAt),
            authUserId: userId,
            role,
            rideId: getId(rideObject),
            rideSnapshot: this.toRideSnapshot(rideObject),
            type: payload.type,
            reason: payload.reason,
            status: DISPUTE_STATUSES.SUBMITTED,
            priority: typeProfile.priority || DISPUTE_PRIORITIES.LOW,
            title: normalizeTitle(payload.title, typeProfile),
            description: payload.description.trim(),
            requestedResolution: payload.requestedResolution || typeProfile.defaultResolution,
            requestedRefundAmount: nullableMoney(payload.requestedRefundAmount),
            currency: DISPUTE_CURRENCY,
            evidence: normalizeEvidence(payload.evidence, submittedAt),
            timeline: {
                submittedAt
            },
            resolution: null,
            trustSignals: this.toTrustSignals(rideObject),
            latestActivityAt: submittedAt
        };

        let dispute;

        try {
            dispute = await this.disputesDao.create(disputePayload);
        } catch (err) {
            if (err.code === 11000) {
                throw AppError.conflict('An active dispute already exists for this ride and type');
            }

            throw err;
        }

        const disputeObject = toPlainObject(dispute);

        return buildSuccessResponse({
            statusCode: 201,
            message: 'Ride dispute submitted successfully',
            data: {
                dispute: toPublicDispute(disputeObject),
                guidance: toPublicDisputeGuidance(disputeObject, typeProfile)
            }
        });
    }

    async addEvidence(authContext, disputeId, payload) {
        const dispute = await this.findDispute(authContext, disputeId);

        if (!isOpenDispute(dispute)) {
            throw AppError.badRequest('Only open disputes can accept evidence');
        }

        const submittedAt = this.now();
        const existingEvidence = Array.isArray(dispute.evidence) ? dispute.evidence : [];
        const evidence = [
            ...existingEvidence,
            ...normalizeEvidence(payload.evidence, submittedAt)
        ];

        if (evidence.length > DISPUTE_MAX_EVIDENCE_ITEMS) {
            throw AppError.badRequest(`A dispute can have up to ${DISPUTE_MAX_EVIDENCE_ITEMS} evidence items`);
        }

        const updatePayload = {
            evidence,
            status: dispute.status === DISPUTE_STATUSES.SUBMITTED
                ? DISPUTE_STATUSES.UNDER_REVIEW
                : dispute.status,
            latestActivityAt: submittedAt
        };

        const { userId, role } = this.assertAuthContext(authContext);
        const updatedDispute = await this.disputesDao.updateByIdForUser(disputeId, userId, role, updatePayload);

        if (!updatedDispute) {
            throw AppError.notFound('Dispute not found');
        }

        const disputeObject = toPlainObject(updatedDispute);

        return buildSuccessResponse({
            message: 'Dispute evidence added successfully',
            data: {
                dispute: toPublicDispute(disputeObject),
                guidance: toPublicDisputeGuidance(disputeObject, resolveTypeProfile(disputeObject.type))
            }
        });
    }

    async cancelDispute(authContext, disputeId, payload = {}) {
        const dispute = await this.findDispute(authContext, disputeId);

        if (!isOpenDispute(dispute)) {
            throw AppError.badRequest('Only open disputes can be cancelled');
        }

        const cancelledAt = this.now();
        const { userId, role } = this.assertAuthContext(authContext);
        const updatedDispute = await this.disputesDao.updateByIdForUser(disputeId, userId, role, {
            status: DISPUTE_STATUSES.CANCELLED,
            timeline: {
                ...dispute.timeline,
                cancelledAt
            },
            resolution: payload.note ? {
                note: payload.note.trim(),
                resolvedAt: cancelledAt
            } : dispute.resolution,
            latestActivityAt: cancelledAt
        });

        if (!updatedDispute) {
            throw AppError.notFound('Dispute not found');
        }

        const disputeObject = toPlainObject(updatedDispute);

        return buildSuccessResponse({
            message: 'Dispute cancelled successfully',
            data: {
                dispute: toPublicDispute(disputeObject),
                guidance: toPublicDisputeGuidance(disputeObject, resolveTypeProfile(disputeObject.type))
            }
        });
    }

    async findDispute(authContext, disputeId) {
        const { userId, role } = this.assertAuthContext(authContext);
        const dispute = await this.disputesDao.findByIdForUser(disputeId, userId, role);

        if (!dispute) {
            throw AppError.notFound('Dispute not found');
        }

        return toPlainObject(dispute);
    }

    async findRideForDispute(rideId, userId, role) {
        const ride = await this.ridesDao.findByIdForUser(rideId, userId, role);

        if (!ride) {
            throw AppError.notFound('Ride not found');
        }

        return ride;
    }

    buildEligibility(ride, disputes = []) {
        const completedAt = this.getRideCompletedAt(ride);
        const cancelledAt = ride.cancellation?.cancelledAt || null;
        const activeDisputes = disputes.filter(isOpenDispute);

        if (!this.isDisputableRide(ride)) {
            return {
                canDispute: false,
                reason: 'Only completed or cancelled rides can be disputed',
                completedAt,
                cancelledAt,
                activeDisputeCount: activeDisputes.length,
                recommendedTypes: []
            };
        }

        return {
            canDispute: true,
            reason: null,
            completedAt,
            cancelledAt,
            activeDisputeCount: activeDisputes.length,
            recommendedTypes: this.resolveRecommendedTypes(ride)
        };
    }

    resolveRecommendedTypes(ride) {
        if (ride.status === RIDE_BOOKING_STATUSES.CANCELLED) {
            return [
                DISPUTE_TYPES.DRIVER_CANCELLATION,
                DISPUTE_TYPES.PAYMENT_ISSUE,
                DISPUTE_TYPES.FARE_OVERCHARGE
            ];
        }

        const recommendations = [];

        if ((ride.trustSignals?.routeAccuracyScore || 100) < 90) {
            recommendations.push(DISPUTE_TYPES.WRONG_ROUTE);
        }

        if ((ride.trustSignals?.fairPriceScore || 100) < 90) {
            recommendations.push(DISPUTE_TYPES.FARE_OVERCHARGE);
        }

        return [
            ...recommendations,
            DISPUTE_TYPES.WAITING_CHARGE,
            DISPUTE_TYPES.FAKE_TRIP,
            DISPUTE_TYPES.SAFETY_CONCERN,
            DISPUTE_TYPES.PAYMENT_ISSUE
        ].filter(uniqueOnly);
    }

    isDisputableRide(ride) {
        if (ride.status === RIDE_BOOKING_STATUSES.CANCELLED) {
            return true;
        }

        return ride.status === RIDE_BOOKING_STATUSES.CONFIRMED
            && Boolean(this.getRideCompletedAt(ride))
            && this.getRideCompletedAt(ride) <= this.now();
    }

    getRideCompletedAt(ride) {
        if (!ride.confirmedAt) {
            return null;
        }

        const confirmedAt = new Date(ride.confirmedAt);

        if (Number.isNaN(confirmedAt.getTime())) {
            return null;
        }

        const etaMinutes = ride.selectedDriver?.etaMinutes || 0;
        const durationMinutes = ride.fareSnapshot?.durationMinutes || 0;

        return addMinutes(addMinutes(confirmedAt, etaMinutes), durationMinutes);
    }

    toRideSnapshot(ride) {
        return {
            bookingCode: ride.bookingCode,
            pickup: ride.pickup,
            dropoff: ride.dropoff,
            vehicleType: ride.vehicleType,
            driver: {
                driverId: ride.selectedDriver?.driverId || null,
                fullName: ride.selectedDriver?.fullName || null,
                vehicleName: ride.selectedDriver?.vehicleName || null,
                vehicleNumber: ride.selectedDriver?.vehicleNumber || null
            }
        };
    }

    toTrustSignals(ride) {
        return {
            driverTrustScore: ride.trustSignals?.driverTrustScore,
            routeAccuracyScore: ride.trustSignals?.routeAccuracyScore,
            fairPriceScore: ride.trustSignals?.fairPriceScore,
            cancellationRiskLevel: ride.trustSignals?.cancellationRiskLevel
        };
    }

    assertAuthContext(authContext) {
        if (!authContext?.userId || !authContext?.role) {
            throw AppError.unauthorized();
        }

        return authContext;
    }
}

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const resolveTypeProfile = (type) => DISPUTE_TYPE_CATALOG.find((item) => item.type === type)
    || DISPUTE_TYPE_CATALOG.find((item) => item.type === DISPUTE_TYPES.OTHER);

const normalizeTitle = (title, typeProfile) => {
    const trimmed = title?.trim();

    return trimmed || typeProfile.label;
};

const normalizeEvidence = (evidence = [], submittedAt) => evidence.map((item) => ({
    type: item.type,
    label: item.label?.trim() || null,
    url: item.url?.trim() || null,
    note: item.note?.trim() || null,
    capturedAt: item.capturedAt || null,
    submittedAt
}));

const nullableMoney = (amount) => Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;

const isOpenDispute = (dispute = {}) => DISPUTE_OPEN_STATUSES.includes(dispute.status);

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

const createDisputeCode = (date) => {
    const compactTimestamp = date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();

    return `DSP-${compactTimestamp}-${randomSuffix}`;
};

const uniqueOnly = (value, index, array) => array.indexOf(value) === index;

const normalizeSummary = (summary = {}) => {
    const totals = summary.totals?.[0] || summary;

    return {
        totalDisputes: totals.totalDisputes || 0,
        openCount: totals.openCount || 0,
        resolvedCount: totals.resolvedCount || 0,
        cancelledCount: totals.cancelledCount || 0,
        urgentCount: totals.urgentCount || 0,
        byStatus: rowsToCounts(summary.statuses),
        byType: rowsToCounts(summary.types),
        latestSubmittedAt: totals.latestSubmittedAt || null
    };
};

const buildSummaryFromDisputes = (disputes = []) => disputes.reduce((summary, dispute) => {
    summary.totalDisputes += 1;
    summary.byStatus[dispute.status] = (summary.byStatus[dispute.status] || 0) + 1;
    summary.byType[dispute.type] = (summary.byType[dispute.type] || 0) + 1;
    summary.latestSubmittedAt = maxDate(summary.latestSubmittedAt, dispute.timeline?.submittedAt);

    if (DISPUTE_OPEN_STATUSES.includes(dispute.status)) {
        summary.openCount += 1;
    }

    if (dispute.status === DISPUTE_STATUSES.RESOLVED) {
        summary.resolvedCount += 1;
    }

    if (dispute.status === DISPUTE_STATUSES.CANCELLED) {
        summary.cancelledCount += 1;
    }

    if (dispute.priority === DISPUTE_PRIORITIES.URGENT) {
        summary.urgentCount += 1;
    }

    return summary;
}, {
    totalDisputes: 0,
    openCount: 0,
    resolvedCount: 0,
    cancelledCount: 0,
    urgentCount: 0,
    byStatus: {},
    byType: {},
    latestSubmittedAt: null
});

const rowsToCounts = (rows = []) => rows.reduce((result, row) => ({
    ...result,
    [row._id]: row.count
}), {});

const maxDate = (left, right) => {
    if (!left) {
        return right || null;
    }

    if (!right) {
        return left;
    }

    return new Date(left) > new Date(right) ? left : right;
};
