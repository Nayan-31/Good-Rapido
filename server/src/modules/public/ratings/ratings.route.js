import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import { createAuthGuard } from '../auth/session/auth-guard.middleware.js';
import TokenService from '../auth/session/token.service.js';
import RidesDao from '../rides/rides.dao.js';
import RatingsController from './ratings.controller.js';
import RatingsDao from './ratings.dao.js';
import RatingsService from './ratings.service.js';
import {
    ratingHistoryQuerySchema,
    ratingParamsSchema,
    rideRatingParamsSchema,
    submitRideRatingSchema,
    updateRatingSchema
} from './validators/ratings.validator.js';

const createRatingsDependencies = ({
    ratingsDao = new RatingsDao(),
    ridesDao = new RidesDao(),
    tokenService = new TokenService(),
    now = () => new Date()
} = {}) => ({
    ratingsDao,
    ridesDao,
    tokenService,
    now
});

export const createRatingsRouter = (dependencies = createRatingsDependencies()) => {
    const router = Router();
    const { ratingsDao, ridesDao, tokenService, now } = dependencies;
    const ratingsService = new RatingsService({ ratingsDao, ridesDao, now });
    const ratingsController = new RatingsController(ratingsService);
    const requireAuth = createAuthGuard({
        tokenService,
        allowedRoles: Object.values(AUTH_ROLES)
    });

    router.use(requireAuth);

    router.get('/options', ratingsController.options);
    router.get('/summary', ratingsController.summary);
    router.get('/history', validate(ratingHistoryQuerySchema), ratingsController.history);
    router.get('/rides/:rideId', validate(rideRatingParamsSchema), ratingsController.getRideRating);
    router.post('/rides/:rideId', validate(submitRideRatingSchema), ratingsController.submitRideRating);
    router.patch('/:ratingId', validate(updateRatingSchema), ratingsController.updateRating);
    router.get('/:ratingId', validate(ratingParamsSchema), ratingsController.getRating);

    return router;
};

export default createRatingsRouter();
