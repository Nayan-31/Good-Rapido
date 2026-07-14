import asyncHandler from '../../../shared/utils/asyncHandler.js';
import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';

export default class AnalyticsController {
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.analyticsService.options(req.auth));
    });

    overview = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.analyticsService.overview(req.auth, req.validatedQuery));
    });

    rides = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.analyticsService.rides(req.auth, req.validatedQuery));
    });

    revenue = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.analyticsService.revenue(req.auth, req.validatedQuery));
    });

    drivers = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.analyticsService.drivers(req.auth, req.validatedQuery));
    });

    trustSafety = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.analyticsService.trustSafety(req.auth, req.validatedQuery));
    });

    forecast = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.analyticsService.forecast(req.auth, req.body));
    });
}
