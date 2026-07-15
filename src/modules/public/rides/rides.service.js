import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import { buildRideLifecycle } from '../../core/ride-lifecycle/ride-lifecycle.engine.js';
import { RIDE_BOOKING_STATUSES } from '../ride-booking/ride-booking.constants.js';
import {
    RIDE_HISTORY_FILTERS,
    RIDE_LIFECYCLE_STATUSES,
    RIDE_PROGRESS_STEPS,
    RIDE_VISIBLE_BOOKING_STATUSES
} from './rides.constants.js';
import {
    toPublicRide,
    toPublicRideHistoryItem,
    toPublicRideReceipt
} from './dto/rides.dto.js';

export default class RidesService {
    constructor({ ridesDao, now = () => new Date() }) {
        this.ridesDao = ridesDao;
        this.now = now;
    }

    async current(authContext) {
        const { userId, role } = this.assertAuthContext(authContext);
        const booking = await this.ridesDao.findCurrentForUser(userId, role);

        if (!booking) {
            return buildSuccessResponse({
                message: 'No current ride found',
                data: {
                    ride: null
                }
            });
        }

        const ride = this.toRide(booking);

        if (!this.isActiveRide(ride)) {
            return buildSuccessResponse({
                message: 'No current ride found',
                data: {
                    ride: null
                }
            });
        }

        return buildSuccessResponse({
            message: 'Current ride fetched successfully',
            data: {
                ride: toPublicRide(ride)
            }
        });
    }

    async history(authContext, query = {}) {
        const { userId, role } = this.assertAuthContext(authContext);
        const statusFilter = query.status || RIDE_HISTORY_FILTERS.ALL;
        const limit = query.limit || 10;
        const bookingStatuses = this.resolveBookingStatuses(statusFilter);
        const lookupLimit = this.needsDerivedFiltering(statusFilter)
            ? Math.min(limit * 3, 60)
            : limit;
        const bookings = await this.ridesDao.findHistoryForUser(userId, role, {
            bookingStatuses,
            limit: lookupLimit
        });
        const rides = bookings
            .map((booking) => this.toRide(booking))
            .filter((ride) => this.matchesHistoryFilter(ride, statusFilter))
            .slice(0, limit);

        return buildSuccessResponse({
            message: 'Ride history fetched successfully',
            data: {
                history: rides.map(toPublicRideHistoryItem)
            }
        });
    }

    async getRide(authContext, rideId) {
        const ride = await this.findVisibleRide(authContext, rideId);

        return buildSuccessResponse({
            message: 'Ride details fetched successfully',
            data: {
                ride: toPublicRide(ride)
            }
        });
    }

    async getReceipt(authContext, rideId) {
        const ride = await this.findVisibleRide(authContext, rideId);

        return buildSuccessResponse({
            message: 'Ride receipt fetched successfully',
            data: toPublicRideReceipt(ride, this.buildReceipt(ride))
        });
    }

    async findVisibleRide(authContext, rideId) {
        const { userId, role } = this.assertAuthContext(authContext);
        const booking = await this.ridesDao.findByIdForUser(rideId, userId, role);

        if (!booking) {
            throw AppError.notFound('Ride not found');
        }

        const bookingObject = toPlainObject(booking);

        if (!RIDE_VISIBLE_BOOKING_STATUSES.includes(bookingObject.status)) {
            throw AppError.notFound('Ride not found');
        }

        return this.toRide(bookingObject);
    }

    toRide(booking) {
        const bookingObject = toPlainObject(booking);
        const lifecycle = buildRideLifecycle(bookingObject, { now: this.now() });
        const { timeline, lifecycleStatus, progress } = lifecycle;

        return {
            id: getId(bookingObject),
            bookingCode: bookingObject.bookingCode,
            authUserId: bookingObject.authUserId?.toString() || bookingObject.authUserId,
            role: bookingObject.role,
            bookingStatus: bookingObject.status,
            lifecycleStatus,
            pickup: bookingObject.pickup,
            dropoff: bookingObject.dropoff,
            vehicleType: bookingObject.vehicleType,
            driver: bookingObject.selectedDriver,
            fare: bookingObject.fareSnapshot,
            trustSignals: bookingObject.trustSignals,
            paymentMethod: bookingObject.paymentMethod,
            riderNote: bookingObject.riderNote,
            timeline,
            progress,
            cancellation: bookingObject.cancellation || null,
            createdAt: bookingObject.createdAt,
            updatedAt: bookingObject.updatedAt
        };
    }

    buildTimeline(booking) {
        const bookedAt = booking.createdAt || null;
        const confirmedAt = booking.confirmedAt || (booking.status === RIDE_BOOKING_STATUSES.CONFIRMED ? bookedAt : null);
        const driverEtaMinutes = booking.selectedDriver?.etaMinutes || 0;
        const rideDurationMinutes = booking.fareSnapshot?.durationMinutes || 0;
        const driverArrivalEtaAt = confirmedAt ? addMinutes(new Date(confirmedAt), driverEtaMinutes) : null;
        const estimatedDropoffAt = driverArrivalEtaAt ? addMinutes(driverArrivalEtaAt, rideDurationMinutes) : null;

        return {
            bookedAt,
            confirmedAt,
            driverArrivalEtaAt,
            estimatedDropoffAt,
            completedAt: null,
            cancelledAt: booking.cancellation?.cancelledAt || null
        };
    }

    resolveLifecycleStatus(booking, timeline) {
        if (booking.status === RIDE_BOOKING_STATUSES.CANCELLED) {
            return RIDE_LIFECYCLE_STATUSES.CANCELLED;
        }

        if (booking.status !== RIDE_BOOKING_STATUSES.CONFIRMED || !timeline.confirmedAt) {
            return RIDE_LIFECYCLE_STATUSES.PENDING_CONFIRMATION;
        }

        const now = this.now();

        if (timeline.driverArrivalEtaAt && now < new Date(timeline.driverArrivalEtaAt)) {
            return RIDE_LIFECYCLE_STATUSES.DRIVER_EN_ROUTE;
        }

        if (timeline.estimatedDropoffAt && now < new Date(timeline.estimatedDropoffAt)) {
            return RIDE_LIFECYCLE_STATUSES.IN_PROGRESS;
        }

        return RIDE_LIFECYCLE_STATUSES.COMPLETED;
    }

    buildProgress(lifecycleStatus, timeline) {
        const now = this.now();
        const currentStep = RIDE_PROGRESS_STEPS[lifecycleStatus];
        const nextAction = this.getNextAction(lifecycleStatus);

        if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.CANCELLED) {
            return { percentage: 0, currentStep, nextAction };
        }

        if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.PENDING_CONFIRMATION) {
            return { percentage: 10, currentStep, nextAction };
        }

        if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.COMPLETED) {
            return { percentage: 100, currentStep, nextAction };
        }

        if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.DRIVER_EN_ROUTE) {
            const percentage = interpolateProgress({
                startAt: timeline.confirmedAt,
                endAt: timeline.driverArrivalEtaAt,
                now,
                min: 15,
                max: 45
            });

            return { percentage, currentStep, nextAction };
        }

        const percentage = interpolateProgress({
            startAt: timeline.driverArrivalEtaAt,
            endAt: timeline.estimatedDropoffAt,
            now,
            min: 45,
            max: 95
        });

        return { percentage, currentStep, nextAction };
    }

    buildReceipt(ride) {
        const isCancelled = ride.lifecycleStatus === RIDE_LIFECYCLE_STATUSES.CANCELLED;
        const totalFare = ride.fare?.totalFare || 0;
        const payableAmount = isCancelled ? 0 : totalFare;

        return {
            receiptNumber: `RCPT-${ride.bookingCode}`,
            issuedAt: this.now(),
            currency: ride.fare?.currency || 'INR',
            lineItems: [
                {
                    code: 'locked_fare',
                    label: 'Locked ride fare',
                    amount: totalFare
                },
                {
                    code: 'cancellation_adjustment',
                    label: isCancelled ? 'Cancelled before payment capture' : 'No cancellation adjustment',
                    amount: isCancelled ? -totalFare : 0
                }
            ],
            fareSummary: {
                distanceKm: ride.fare?.distanceKm || 0,
                durationMinutes: ride.fare?.durationMinutes || 0,
                surgeMultiplier: ride.fare?.surgeMultiplier || 1,
                fareConfidenceScore: ride.fare?.confidenceScore || 0
            },
            trustSummary: {
                fairPriceScore: ride.trustSignals?.fairPriceScore || 0,
                routeAccuracyScore: ride.trustSignals?.routeAccuracyScore || 0,
                driverTrustScore: ride.trustSignals?.driverTrustScore || 0,
                cancellationRiskLevel: ride.trustSignals?.cancellationRiskLevel || null
            },
            paymentSummary: {
                method: ride.paymentMethod || null,
                payableAmount,
                paidAmount: payableAmount,
                refundedAmount: 0
            }
        };
    }

    resolveBookingStatuses(statusFilter) {
        if (statusFilter === RIDE_HISTORY_FILTERS.CANCELLED) {
            return [RIDE_BOOKING_STATUSES.CANCELLED];
        }

        if (
            statusFilter === RIDE_HISTORY_FILTERS.ACTIVE
            || statusFilter === RIDE_HISTORY_FILTERS.COMPLETED
        ) {
            return [RIDE_BOOKING_STATUSES.CONFIRMED];
        }

        return [
            RIDE_BOOKING_STATUSES.CONFIRMED,
            RIDE_BOOKING_STATUSES.CANCELLED
        ];
    }

    matchesHistoryFilter(ride, statusFilter) {
        if (statusFilter === RIDE_HISTORY_FILTERS.ACTIVE) {
            return this.isActiveRide(ride);
        }

        if (statusFilter === RIDE_HISTORY_FILTERS.COMPLETED) {
            return ride.lifecycleStatus === RIDE_LIFECYCLE_STATUSES.COMPLETED;
        }

        if (statusFilter === RIDE_HISTORY_FILTERS.CANCELLED) {
            return ride.lifecycleStatus === RIDE_LIFECYCLE_STATUSES.CANCELLED;
        }

        return true;
    }

    needsDerivedFiltering(statusFilter) {
        return [
            RIDE_HISTORY_FILTERS.ACTIVE,
            RIDE_HISTORY_FILTERS.COMPLETED
        ].includes(statusFilter);
    }

    isActiveRide(ride) {
        return [
            RIDE_LIFECYCLE_STATUSES.DRIVER_EN_ROUTE,
            RIDE_LIFECYCLE_STATUSES.DRIVER_ARRIVED,
            RIDE_LIFECYCLE_STATUSES.IN_PROGRESS
        ].includes(ride.lifecycleStatus);
    }

    getNextAction(lifecycleStatus) {
        if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.DRIVER_EN_ROUTE) {
            return 'Meet the driver at the pickup point';
        }

        if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.IN_PROGRESS) {
            return 'Track the route and review trip safety signals';
        }

        if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.COMPLETED) {
            return 'Review receipt and share ride feedback';
        }

        if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.CANCELLED) {
            return 'Check cancellation details and rebook if needed';
        }

        return 'Confirm the booking to start ride tracking';
    }

    assertAuthContext(authContext) {
        if (!authContext?.userId || !authContext?.role) {
            throw AppError.unauthorized();
        }

        return authContext;
    }
}

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const getId = (document) => document._id?.toString() || document.id;

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

const interpolateProgress = ({ startAt, endAt, now, min, max }) => {
    if (!startAt || !endAt) {
        return min;
    }

    const startTime = new Date(startAt).getTime();
    const endTime = new Date(endAt).getTime();

    if (endTime <= startTime) {
        return max;
    }

    const elapsedRatio = (now.getTime() - startTime) / (endTime - startTime);

    return Math.round(clamp(min + elapsedRatio * (max - min), min, max));
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
