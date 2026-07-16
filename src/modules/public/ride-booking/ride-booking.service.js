import { toPublicFareEstimate } from '../fare/dto/fare.dto.js';
import { buildDriverMatches } from '../../core/matching-engine/matching-engine.engine.js';
import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    RIDE_BOOKING_DRIVER_POOL,
    RIDE_BOOKING_QUOTE_HOLD_MINUTES,
    RIDE_BOOKING_STATUSES
} from './ride-booking.constants.js';
import {
    toPublicDriverOption,
    toPublicRideBooking,
    toPublicRideSearch
} from './dto/ride-booking.dto.js';

export default class RideBookingService {
    constructor({ bookingDao, fareDao }) {
        this.bookingDao = bookingDao;
        this.fareDao = fareDao;
    }

    async search(authContext, payload) {
        const { userId, role } = this.assertAuthContext(authContext);
        const fareEstimate = await this.findUsableFareEstimate(payload.fareEstimateId, userId, role);
        const fareEstimateObject = toPlainObject(fareEstimate);
        const driverOptions = this.findDriverOptions(fareEstimateObject.vehicleType, payload.limit, fareEstimateObject);

        return buildSuccessResponse({
            message: 'Ride search completed successfully',
            data: {
                search: toPublicRideSearch({
                    fareEstimate: toPublicFareEstimate(fareEstimate),
                    driverOptions,
                    trustSummary: this.buildTrustSummary(driverOptions, fareEstimateObject)
                })
            }
        });
    }

    async createBooking(authContext, payload) {
        const { userId, role } = this.assertAuthContext(authContext);
        const fareEstimate = await this.findUsableFareEstimate(payload.fareEstimateId, userId, role);
        const fareEstimateObject = toPlainObject(fareEstimate);
        const selectedDriver = this.resolveDriver(fareEstimateObject.vehicleType, payload.selectedDriverId, fareEstimateObject);
        const booking = await this.bookingDao.create({
            bookingCode: createBookingCode(),
            authUserId: userId,
            role,
            fareEstimateId: getId(fareEstimateObject),
            status: RIDE_BOOKING_STATUSES.DRIVER_SELECTED,
            pickup: fareEstimateObject.pickup,
            dropoff: fareEstimateObject.dropoff,
            vehicleType: fareEstimateObject.vehicleType,
            selectedDriver: this.toSelectedDriverSnapshot(selectedDriver),
            fareSnapshot: this.toFareSnapshot(fareEstimateObject),
            trustSignals: this.buildTrustSignals(selectedDriver, fareEstimateObject),
            paymentMethod: payload.paymentMethod || 'personal_wallet',
            riderNote: payload.riderNote,
            expiresAt: this.getBookingExpiry(fareEstimateObject)
        });

        return buildSuccessResponse({
            statusCode: 201,
            message: 'Ride booking created successfully',
            data: {
                booking: toPublicRideBooking(booking),
                driverOptions: this.findDriverOptions(fareEstimateObject.vehicleType, 3, fareEstimateObject).map(toPublicDriverOption)
            }
        });
    }

    async getBooking(authContext, bookingId) {
        const { userId, role } = this.assertAuthContext(authContext);
        const booking = await this.bookingDao.findByIdForUser(bookingId, userId, role);

        if (!booking) {
            throw AppError.notFound('Ride booking not found');
        }

        return buildSuccessResponse({
            message: 'Ride booking fetched successfully',
            data: {
                booking: toPublicRideBooking(booking)
            }
        });
    }

    async selectDriver(authContext, bookingId, driverId) {
        const { userId, role } = this.assertAuthContext(authContext);
        const booking = await this.getMutableBooking(bookingId, userId, role);
        const bookingObject = toPlainObject(booking);
        const selectedDriver = this.resolveDriver(bookingObject.vehicleType, driverId, bookingObject);
        const updatedBooking = await this.bookingDao.updateSelectedDriver(
            bookingId,
            userId,
            role,
            this.toSelectedDriverSnapshot(selectedDriver),
            this.buildTrustSignals(selectedDriver, bookingObject.fareSnapshot)
        );

        if (!updatedBooking) {
            throw AppError.notFound('Ride booking not found');
        }

        return buildSuccessResponse({
            message: 'Ride driver selected successfully',
            data: {
                booking: toPublicRideBooking(updatedBooking)
            }
        });
    }

    async confirmBooking(authContext, bookingId) {
        const { userId, role } = this.assertAuthContext(authContext);
        const booking = await this.getMutableBooking(bookingId, userId, role);
        const bookingObject = toPlainObject(booking);

        if (new Date(bookingObject.expiresAt) < new Date()) {
            throw AppError.badRequest('Ride booking quote has expired. Create a new booking to continue');
        }

        const confirmedBooking = await this.bookingDao.confirmBooking(bookingId, userId, role, new Date());

        if (!confirmedBooking) {
            throw AppError.notFound('Ride booking not found');
        }

        return buildSuccessResponse({
            message: 'Ride booking confirmed successfully',
            data: {
                booking: toPublicRideBooking(confirmedBooking)
            }
        });
    }

    async cancelBooking(authContext, bookingId, payload) {
        const { userId, role } = this.assertAuthContext(authContext);
        const booking = await this.bookingDao.findByIdForUser(bookingId, userId, role);

        if (!booking) {
            throw AppError.notFound('Ride booking not found');
        }

        const bookingObject = toPlainObject(booking);

        if (bookingObject.status === RIDE_BOOKING_STATUSES.CANCELLED) {
            throw AppError.badRequest('Ride booking is already cancelled');
        }

        const cancelledBooking = await this.bookingDao.cancelBooking(bookingId, userId, role, {
            reason: payload.reason,
            note: payload.note,
            cancelledAt: new Date()
        });

        if (!cancelledBooking) {
            throw AppError.notFound('Ride booking not found');
        }

        return buildSuccessResponse({
            message: 'Ride booking cancelled successfully',
            data: {
                booking: toPublicRideBooking(cancelledBooking)
            }
        });
    }

    async findUsableFareEstimate(fareEstimateId, userId, role) {
        const fareEstimate = await this.fareDao.findByIdForUser(fareEstimateId, userId, role);

        if (!fareEstimate) {
            throw AppError.notFound('Fare estimate not found');
        }

        const fareEstimateObject = toPlainObject(fareEstimate);

        if (new Date(fareEstimateObject.validUntil) < new Date()) {
            throw AppError.badRequest('Fare estimate has expired. Request a new estimate before booking');
        }

        return fareEstimate;
    }

    async getMutableBooking(bookingId, userId, role) {
        const booking = await this.bookingDao.findByIdForUser(bookingId, userId, role);

        if (!booking) {
            throw AppError.notFound('Ride booking not found');
        }

        const bookingObject = toPlainObject(booking);

        if (bookingObject.status === RIDE_BOOKING_STATUSES.CANCELLED) {
            throw AppError.badRequest('Ride booking is already cancelled');
        }

        if (bookingObject.status === RIDE_BOOKING_STATUSES.CONFIRMED) {
            throw AppError.badRequest('Ride booking is already confirmed');
        }

        return booking;
    }

    findDriverOptions(vehicleType, limit = 3, rideContext = {}) {
        return buildDriverMatches({
            pickup: rideContext.pickup,
            vehicleType,
            drivers: RIDE_BOOKING_DRIVER_POOL,
            limit
        }).matches;
    }

    resolveDriver(vehicleType, driverId, rideContext = {}) {
        const options = this.findDriverOptions(vehicleType, 5, rideContext);

        if (!options.length) {
            throw AppError.notFound('No trusted drivers are currently available for this ride');
        }

        if (!driverId) {
            return options[0];
        }

        const selectedDriver = options.find((driver) => driver.driverId === driverId || driver.id === driverId);

        if (!selectedDriver) {
            throw AppError.badRequest('Selected driver is not available for this fare estimate');
        }

        return selectedDriver;
    }

    toSelectedDriverSnapshot(driver) {
        return {
            driverId: driver.driverId || driver.id,
            fullName: driver.fullName,
            rating: driver.rating,
            vehicleName: driver.vehicleName,
            vehicleNumber: driver.vehicleNumber,
            vehicleColor: driver.vehicleColor,
            etaMinutes: driver.etaMinutes,
            distanceKm: driver.distanceKm
        };
    }

    toFareSnapshot(fareEstimate) {
        return {
            currency: fareEstimate.breakdown?.currency || 'INR',
            totalFare: fareEstimate.breakdown?.totalFare || 0,
            distanceKm: fareEstimate.distanceKm || 0,
            durationMinutes: fareEstimate.durationMinutes || 0,
            surgeMultiplier: fareEstimate.surge?.multiplier || 1,
            confidenceScore: fareEstimate.confidence?.score || 0,
            validUntil: fareEstimate.validUntil,
            lockedUntil: fareEstimate.lock?.lockedUntil || null
        };
    }

    buildTrustSignals(driver, fareSource) {
        return {
            driverTrustScore: driver.trustScore,
            driverReliabilityScore: driver.reliabilityScore,
            routeFairnessScore: driver.routeFairnessScore,
            routeAccuracyScore: Math.min(99, Math.round((driver.routeFairnessScore + driver.onTimeArrivalScore) / 2)),
            cancellationRiskScore: driver.cancellationRiskScore,
            cancellationRiskLevel: driver.cancellationRiskLevel,
            cancellationRatio: driver.cancellationRatio,
            detourPercentage: driver.detourPercentage,
            onTimeArrivalScore: driver.onTimeArrivalScore,
            fairPriceScore: fareSource.confidence?.score || fareSource.confidenceScore || 0
        };
    }

    buildTrustSummary(driverOptions, fareEstimate) {
        const bestDriver = driverOptions[0]; //array me se first driver ko best driver maana ja raha hai. Kyunki pehle wale function me drivers already ranking/sorting ke baad aaye honge.

        if (!bestDriver) {
            return {
                fairPriceScore: fareEstimate.confidence?.score || 0,
                routeAccuracyScore: 0,
                cancellationRiskLevel: 'high',
                message: 'No trusted drivers are currently available'
            };
        }

        return {
            fairPriceScore: fareEstimate.confidence?.score || 0,
            routeAccuracyScore: Math.min(99, Math.round((bestDriver.routeFairnessScore + bestDriver.onTimeArrivalScore) / 2)),
            cancellationRiskLevel: bestDriver.cancellationRiskLevel,
            message: 'Best matches are ranked by trust, route fairness, arrival reliability, and cancellation behavior'
        };
    }

    getBookingExpiry(fareEstimate) {
        const lockedUntil = fareEstimate.lock?.lockedUntil ? new Date(fareEstimate.lock.lockedUntil) : null;

        if (lockedUntil && lockedUntil > new Date()) {
            return lockedUntil;
        }

        return addMinutes(new Date(), RIDE_BOOKING_QUOTE_HOLD_MINUTES);
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

const createBookingCode = () => {
    const timestampPart = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();

    return `GR-${timestampPart}-${randomPart}`;
};
