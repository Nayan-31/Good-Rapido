import env from "../../config/env.js"

const request = new Map()
const MAX_REQUEST = env.NODE_ENV === 'production' ? env.RATELIMIT : Math.max(env.RATELIMIT, 1000)
const WINDOW_MS = env.RATELIMIT_WINDOWS;

const cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [ip, userData] of request.entries()) { //Iterates over every entry in the Map. Each iteration destructures the entry into ip (the key). and userData (the value object).
        if (now > userData.startTime + WINDOW_MS) { //Checks if the IP's time window has expired — i.e., more than 60 seconds have passed since they started.
            request.delete(ip) //If the window is expired, removes that IP from the Map entirely to free memory.
        }
    }
}, 5 * 60 * 1000)

cleanupInterval.unref?.()

export const rateLimiter = (req, res, next) => {
    if (req.method === 'OPTIONS' || shouldSkipRateLimit(req)) {
        return next();
    }

    const ip = req.ip;

    if (!request.has(ip)) {
        request.set(ip, {
            count: 1,
            startTime: Date.now()
        });
        return next()
    }
    const userData = request.get(ip)

    // If the time window has passed, reset the count and time
    if (Date.now() - userData.startTime > WINDOW_MS) {
        request.set(ip, {
            count: 1,
            startTime: Date.now()
        })
        return next()
    }

    // If within the time window and over the limit
    if (userData.count >= MAX_REQUEST) {
        res.set('Retry-After', String(Math.ceil((userData.startTime + WINDOW_MS - Date.now()) / 1000)));

        return res.status(429).json({
            success: false,
            message: "Too many requests. Please try again later"
        })
    }

    // Otherwise, increment the count
    userData.count++
    request.set(ip, userData);
    next()
}

const shouldSkipRateLimit = (req) => {
    if (env.NODE_ENV === 'production') {
        return false;
    }

    return isLocalAddress(req.ip)
        || isLocalAddress(req.hostname)
        || isLocalAddress(req.headers.host?.split(':')[0]);
};

const isLocalAddress = (value = '') => [
    'localhost',
    '127.0.0.1',
    '::1',
    '::ffff:127.0.0.1'
].includes(value);
