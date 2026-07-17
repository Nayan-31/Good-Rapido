import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';
import asyncHandler from '../../../shared/utils/asyncHandler.js';

export default class RatingsController {
    constructor(ratingsService) {
        this.ratingsService = ratingsService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.ratingsService.options(req.auth));
    });

    summary = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.ratingsService.summary(req.auth));
    });

    history = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.ratingsService.history(req.auth, req.validatedQuery));
    });

    getRating = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.ratingsService.getRating(req.auth, req.params.ratingId));
    });

    getRideRating = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.ratingsService.getRideRating(req.auth, req.params.rideId));
    });

    submitRideRating = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.ratingsService.submitRideRating(req.auth, req.params.rideId, req.body));
    });

    updateRating = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.ratingsService.updateRating(req.auth, req.params.ratingId, req.body));
    });
}
