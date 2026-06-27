import {
    FARE_CONFIDENCE_LEVELS,
    FARE_CURRENCY,
    FARE_ESTIMATE_WINDOW_MINUTES,
    FARE_LOCK_WINDOW_MINUTES,
    FARE_ROUTE_DISTANCE_MULTIPLIER,
    FARE_SURGE_LEVELS,
    FARE_TAX_RATE,
    FARE_VEHICLE_PRICING
} from './fare.constants.js';
import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import { toPublicFareEstimate, toPublicFareHistoryItem } from './dto/fare.dto.js';

const EARTH_RADIUS_KM = 6371;

export default class FareService {
    constructor({ dao }) {
        this.dao = dao;
    }

    async createEstimate(authContext, payload) {
        const { userId, role } = this.assertAuthContext(authContext);
        const requestedAt = this.normalizeRequestedAt(payload.requestedAt);
        const pickup = this.normalizeLocation(payload.pickup);
        const dropoff = this.normalizeLocation(payload.dropoff);
        const distanceKm = this.calculateRouteDistanceKm(pickup, dropoff);
        const durationMinutes = this.calculateDurationMinutes(distanceKm, payload.vehicleType);
        const surge = this.calculateSurge(requestedAt);
        const breakdown = this.calculateBreakdown({
            distanceKm,
            durationMinutes,
            vehicleType: payload.vehicleType,
            surgeMultiplier: surge.multiplier
        });
        const confidence = this.calculateConfidence({ distanceKm, requestedAt, surge });
        const alternativePickups = this.calculateAlternativePickups({
            pickup,
            currentTotalFare: breakdown.totalFare,
            surge
        });

        const estimate = await this.dao.create({
            authUserId: userId,
            role,
            pickup,
            dropoff,
            vehicleType: payload.vehicleType,
            requestedAt,
            distanceKm,
            durationMinutes,
            breakdown,
            surge,
            confidence,
            alternativePickups,
            validUntil: addMinutes(new Date(), FARE_ESTIMATE_WINDOW_MINUTES),
            lock: {
                isLocked: false,
                lockedUntil: null
            }
        });

        return buildSuccessResponse({
            statusCode: 201,
            message: 'Fare estimate created successfully',
            data: {
                estimate: toPublicFareEstimate(estimate)
            }
        });
    }

    async getEstimate(authContext, estimateId) {
        const { userId, role } = this.assertAuthContext(authContext);
        const estimate = await this.dao.findByIdForUser(estimateId, userId, role);

        if (!estimate) {
            throw AppError.notFound('Fare estimate not found');
        }

        return buildSuccessResponse({
            message: 'Fare estimate fetched successfully',
            data: {
                estimate: toPublicFareEstimate(estimate)
            }
        });
    }

    async lockEstimate(authContext, estimateId) {
        const { userId, role } = this.assertAuthContext(authContext);
        const existingEstimate = await this.dao.findByIdForUser(estimateId, userId, role);

        if (!existingEstimate) {
            throw AppError.notFound('Fare estimate not found');
        }

        const existingEstimateObject = existingEstimate.toObject ? existingEstimate.toObject() : existingEstimate;

        if (existingEstimateObject.validUntil && new Date(existingEstimateObject.validUntil) < new Date()) {
            throw AppError.badRequest('Fare estimate has expired. Request a new estimate to lock pricing');
        }

        const lockedUntil = addMinutes(new Date(), FARE_LOCK_WINDOW_MINUTES);
        const lockedEstimate = await this.dao.lockEstimate(estimateId, userId, role, lockedUntil);

        if (!lockedEstimate) {
            throw AppError.notFound('Fare estimate not found');
        }

        return buildSuccessResponse({
            message: 'Fare locked successfully',
            data: {
                estimate: toPublicFareEstimate(lockedEstimate)
            }
        });
    }

    async history(authContext, query = {}) {
        const { userId, role } = this.assertAuthContext(authContext);
        const estimates = await this.dao.findRecentForUser(userId, role, query);

        return buildSuccessResponse({
            message: 'Fare history fetched successfully',
            data: {
                history: estimates.map(toPublicFareHistoryItem)
            }
        });
    }

    normalizeLocation(location) {
        return {
            ...(location.address ? { address: location.address.trim() } : {}),
            latitude: location.latitude,
            longitude: location.longitude
        };
    }

    normalizeRequestedAt(requestedAt) {
        const date = requestedAt ? new Date(requestedAt) : new Date();

        if (Number.isNaN(date.getTime())) {
            throw AppError.badRequest('requestedAt must be a valid date-time');
        }

        return date;
    }

    calculateRouteDistanceKm(pickup, dropoff) {
        const pickupLatitude = degreesToRadians(pickup.latitude);
        const dropoffLatitude = degreesToRadians(dropoff.latitude);
        const latitudeDelta = degreesToRadians(dropoff.latitude - pickup.latitude);
        const longitudeDelta = degreesToRadians(dropoff.longitude - pickup.longitude);
        const haversine = Math.sin(latitudeDelta / 2) ** 2
            + Math.cos(pickupLatitude) * Math.cos(dropoffLatitude) * Math.sin(longitudeDelta / 2) ** 2;
        const straightLineDistance = 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

        return roundDistance(straightLineDistance * FARE_ROUTE_DISTANCE_MULTIPLIER);
    }

    calculateDurationMinutes(distanceKm, vehicleType) {
        const pricing = this.getPricing(vehicleType);

        return Math.max(2, Math.round((distanceKm / pricing.averageSpeedKmph) * 60 + 4));
    }

    calculateSurge(requestedAt) {
        const hour = requestedAt.getHours();

        if (hour >= 17 && hour <= 21) {
            return {
                multiplier: 1.32,
                level: FARE_SURGE_LEVELS.HIGH,
                reason: 'Evening commute demand is higher than usual'
            };
        }

        if (hour >= 8 && hour <= 10) {
            return {
                multiplier: 1.18,
                level: FARE_SURGE_LEVELS.MODERATE,
                reason: 'Morning commute demand is above normal'
            };
        }

        if (hour >= 22 || hour <= 5) {
            return {
                multiplier: 1.12,
                level: FARE_SURGE_LEVELS.MODERATE,
                reason: 'Late-night driver availability is lower'
            };
        }

        return {
            multiplier: 1,
            level: FARE_SURGE_LEVELS.NORMAL,
            reason: 'Demand and driver availability are normal'
        };
    }

    calculateBreakdown({ distanceKm, durationMinutes, vehicleType, surgeMultiplier }) {
        const pricing = this.getPricing(vehicleType);
        const baseFare = pricing.baseFare;
        const distanceFare = roundMoney(distanceKm * pricing.perKm);
        const timeFare = roundMoney(durationMinutes * pricing.perMinute);
        const meteredFare = roundMoney(baseFare + distanceFare + timeFare);
        const minimumAdjustedFare = Math.max(meteredFare, pricing.minimumFare);
        const minFareAdjustment = roundMoney(minimumAdjustedFare - meteredFare);
        const surgeFare = roundMoney(minimumAdjustedFare * (surgeMultiplier - 1));
        const platformFee = pricing.platformFee;
        const taxes = roundMoney((minimumAdjustedFare + surgeFare + platformFee) * FARE_TAX_RATE);
        const totalFare = roundMoney(minimumAdjustedFare + surgeFare + platformFee + taxes);

        return {
            currency: FARE_CURRENCY,
            baseFare,
            distanceFare,
            timeFare,
            minFareAdjustment,
            surgeFare,
            platformFee,
            taxes,
            totalFare
        };
    }

    calculateConfidence({ distanceKm, requestedAt, surge }) {
        const factors = [];
        let score = 94;

        if (surge.multiplier >= 1.3) {
            score -= 14;
            factors.push('Peak demand can move prices quickly');
        } else if (surge.multiplier > 1) {
            score -= 8;
            factors.push('Demand is above normal');
        }

        if (distanceKm > 25) {
            score -= 7;
            factors.push('Longer routes can vary with traffic and route choice');
        }

        if (distanceKm < 1.5) {
            score -= 5;
            factors.push('Short rides are more sensitive to minimum fare rules');
        }

        if (requestedAt.getTime() - Date.now() > 30 * 60 * 1000) {
            score -= 5;
            factors.push('Future estimates can shift before pickup time');
        }

        const normalizedScore = clamp(score, 0, 100);

        return {
            score: normalizedScore,
            level: this.getConfidenceLevel(normalizedScore),
            factors: factors.length ? factors : ['Stable local demand and standard route distance']
        };
    }

    calculateAlternativePickups({ pickup, currentTotalFare, surge }) {
        const savingsRates = surge.multiplier > 1 ? [0.08, 0.05] : [0.03, 0.02];

        return [
            this.createAlternativePickup({
                label: 'Pickup 250m north',
                pickup,
                northMeters: 250,
                eastMeters: 0,
                walkingDistanceMeters: 250,
                savingsRate: savingsRates[0],
                currentTotalFare,
                reason: 'Nearby pickup may avoid a busier demand pocket'
            }),
            this.createAlternativePickup({
                label: 'Pickup 400m east',
                pickup,
                northMeters: 0,
                eastMeters: 400,
                walkingDistanceMeters: 400,
                savingsRate: savingsRates[1],
                currentTotalFare,
                reason: 'Slightly quieter pickup point with similar route distance'
            })
        ];
    }

    createAlternativePickup({
        label,
        pickup,
        northMeters,
        eastMeters,
        walkingDistanceMeters,
        savingsRate,
        currentTotalFare,
        reason
    }) {
        const shiftedPickup = shiftLocation(pickup, northMeters, eastMeters);
        const estimatedSavings = roundMoney(currentTotalFare * savingsRate);

        return {
            label,
            pickup: shiftedPickup,
            walkingDistanceMeters,
            estimatedSavings,
            estimatedFare: roundMoney(Math.max(currentTotalFare - estimatedSavings, 0)),
            reason
        };
    }

    getPricing(vehicleType) {
        const pricing = FARE_VEHICLE_PRICING[vehicleType];

        if (!pricing) {
            throw AppError.badRequest('Unsupported vehicle type');
        }

        return pricing;
    }

    getConfidenceLevel(score) {
        if (score >= 85) {
            return FARE_CONFIDENCE_LEVELS.HIGH;
        }

        if (score >= 70) {
            return FARE_CONFIDENCE_LEVELS.MEDIUM;
        }

        return FARE_CONFIDENCE_LEVELS.LOW;
    }

    assertAuthContext(authContext) {
        if (!authContext?.userId || !authContext?.role) {
            throw AppError.unauthorized();
        }

        return authContext;
    }
}

const addMinutes = (date, minutes) => {
    return new Date(date.getTime() + minutes * 60 * 1000);
};

const degreesToRadians = (degrees) => degrees * (Math.PI / 180);

const roundMoney = (value) => Number(value.toFixed(2));

const roundDistance = (value) => Number(value.toFixed(2));

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const shiftLocation = (location, northMeters, eastMeters) => {
    const latitudeOffset = northMeters / 111320;
    const longitudeScale = 111320 * Math.cos(degreesToRadians(location.latitude));
    const longitudeOffset = longitudeScale === 0 ? 0 : eastMeters / longitudeScale;

    return {
        ...(location.address ? { address: location.address } : {}),
        latitude: roundCoordinate(location.latitude + latitudeOffset),
        longitude: roundCoordinate(location.longitude + longitudeOffset)
    };
};

const roundCoordinate = (value) => Number(value.toFixed(6));
