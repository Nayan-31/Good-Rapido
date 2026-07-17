export const DRIVER_AVAILABILITY_STATUSES = Object.freeze({
    OFFLINE: 'offline',
    ONLINE: 'online',
    PAUSED: 'paused'
});

export const DRIVER_LOCATION_SOURCES = Object.freeze({
    GPS: 'gps',
    NETWORK: 'network',
    MANUAL: 'manual'
});

export const DRIVER_LOCATION_STALE_AFTER_SECONDS = 90;

export const DRIVER_MAX_ACTIVE_SERVICE_ZONES = 8;
