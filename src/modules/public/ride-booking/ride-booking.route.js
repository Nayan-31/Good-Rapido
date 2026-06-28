import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import { createAuthGuard } from '../auth/session/auth-guard.middleware.js';
import TokenService from '../auth/session/token.service.js';
import FareDao from '../fare/fare.dao.js';
import RideBookingController from './ride-booking.controller.js';
import RideBookingDao from './ride-booking.dao.js';
import RideBookingService from './ride-booking.service.js';
import {
    cancelRideBookingSchema,
    createRideBookingSchema,
    rideBookingParamsSchema,
    searchRideSchema,
    selectRideBookingDriverSchema
} from './validators/ride-booking.validator.js';

const createRideBookingDependencies = ({
    rideBookingDao = new RideBookingDao(),
    fareDao = new FareDao(),
    tokenService = new TokenService()
} = {}) => ({
    rideBookingDao,
    fareDao,
    tokenService
});

export const createRideBookingRouter = (dependencies = createRideBookingDependencies()) => {
    const router = Router();
    const { rideBookingDao, fareDao, tokenService } = dependencies;
    const rideBookingService = new RideBookingService({
        bookingDao: rideBookingDao,
        fareDao
    });
    const rideBookingController = new RideBookingController(rideBookingService);
    const requireAuth = createAuthGuard({
        tokenService,
        allowedRoles: Object.values(AUTH_ROLES)
    });

    router.use(requireAuth);

    router.post('/search', validate(searchRideSchema), rideBookingController.search);
    router.post('/bookings', validate(createRideBookingSchema), rideBookingController.createBooking);
    router.get('/bookings/:bookingId', validate(rideBookingParamsSchema), rideBookingController.getBooking);
    router.patch('/bookings/:bookingId/driver', validate(selectRideBookingDriverSchema), rideBookingController.selectDriver);
    router.post('/bookings/:bookingId/confirm', validate(rideBookingParamsSchema), rideBookingController.confirmBooking);
    router.post('/bookings/:bookingId/cancel', validate(cancelRideBookingSchema), rideBookingController.cancelBooking);

    return router;
};

export default createRideBookingRouter();
