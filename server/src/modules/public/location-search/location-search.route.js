import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import LocationSearchController from './location-search.controller.js';
import LocationSearchService from './location-search.service.js';
import {
    locationResolveParamsSchema,
    locationSearchQuerySchema
} from './validators/location-search.validator.js';

export const createLocationSearchRouter = ({
    locationSearchService = new LocationSearchService()
} = {}) => {
    const router = Router();
    const locationSearchController = new LocationSearchController(locationSearchService);

    router.get('/search', validate(locationSearchQuerySchema), locationSearchController.search);
    router.get('/places/:placeId', validate(locationResolveParamsSchema), locationSearchController.resolve);

    return router;
};

export default createLocationSearchRouter();
