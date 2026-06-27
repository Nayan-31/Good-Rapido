export const FARE_VEHICLE_TYPES = Object.freeze({
    BIKE: 'bike',
    AUTO: 'auto',
    CAB_ECONOMY: 'cab_economy',
    CAB_PREMIUM: 'cab_premium'
});

export const FARE_CURRENCY = 'INR';

export const FARE_ESTIMATE_WINDOW_MINUTES = 10;
export const FARE_LOCK_WINDOW_MINUTES = 3;
export const FARE_ROUTE_DISTANCE_MULTIPLIER = 1.28;
export const FARE_TAX_RATE = 0.05;

export const FARE_SURGE_LEVELS = Object.freeze({
    NORMAL: 'normal',
    MODERATE: 'moderate',
    HIGH: 'high'
});

export const FARE_CONFIDENCE_LEVELS = Object.freeze({
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
});

export const FARE_VEHICLE_PRICING = Object.freeze({
    [FARE_VEHICLE_TYPES.BIKE]: Object.freeze({
        label: 'Bike',
        baseFare: 25,
        perKm: 8.5,
        perMinute: 1,
        minimumFare: 35,
        platformFee: 6,
        averageSpeedKmph: 28
    }),
    [FARE_VEHICLE_TYPES.AUTO]: Object.freeze({
        label: 'Auto',
        baseFare: 35,
        perKm: 14,
        perMinute: 1.5,
        minimumFare: 50,
        platformFee: 10,
        averageSpeedKmph: 22
    }),
    [FARE_VEHICLE_TYPES.CAB_ECONOMY]: Object.freeze({
        label: 'Economy Cab',
        baseFare: 60,
        perKm: 18,
        perMinute: 2.5,
        minimumFare: 85,
        platformFee: 18,
        averageSpeedKmph: 26
    }),
    [FARE_VEHICLE_TYPES.CAB_PREMIUM]: Object.freeze({
        label: 'Premium Cab',
        baseFare: 90,
        perKm: 28,
        perMinute: 3.5,
        minimumFare: 140,
        platformFee: 25,
        averageSpeedKmph: 28
    })
});
