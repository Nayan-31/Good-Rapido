export const RATING_MIN_SCORE = 1;
export const RATING_MAX_SCORE = 5;
export const RATING_EDIT_WINDOW_DAYS = 7;

export const RATING_STATUSES = Object.freeze({
    SUBMITTED: 'submitted',
    UPDATED: 'updated'
});

export const RATING_SENTIMENTS = Object.freeze({
    POSITIVE: 'positive',
    NEUTRAL: 'neutral',
    NEGATIVE: 'negative'
});

export const RATING_TAGS = Object.freeze({
    PROFESSIONAL_DRIVER: 'professional_driver',
    CLEAN_VEHICLE: 'clean_vehicle',
    SAFE_DRIVING: 'safe_driving',
    ON_TIME_PICKUP: 'on_time_pickup',
    FAIR_ROUTE: 'fair_route',
    FAIR_FARE: 'fair_fare',
    POLITE_BEHAVIOR: 'polite_behavior',
    VEHICLE_ISSUE: 'vehicle_issue',
    ROUTE_ISSUE: 'route_issue',
    FARE_ISSUE: 'fare_issue',
    SAFETY_CONCERN: 'safety_concern',
    LATE_PICKUP: 'late_pickup'
});

export const RATING_DIMENSIONS = Object.freeze({
    DRIVER_BEHAVIOR: 'driverBehavior',
    ROUTE_QUALITY: 'routeQuality',
    VEHICLE_CONDITION: 'vehicleCondition',
    VALUE_FOR_MONEY: 'valueForMoney',
    SAFETY: 'safety'
});

export const RATING_SCALE_LABELS = Object.freeze({
    1: 'Very poor',
    2: 'Poor',
    3: 'Okay',
    4: 'Good',
    5: 'Excellent'
});

export const RATING_GUIDANCE = Object.freeze({
    [RATING_SENTIMENTS.POSITIVE]: 'Thanks for helping reinforce trustworthy rides',
    [RATING_SENTIMENTS.NEUTRAL]: 'Thanks, this helps us spot where the ride experience can improve',
    [RATING_SENTIMENTS.NEGATIVE]: 'Thanks for flagging this. Low ratings can be reviewed for trust and route quality'
});
