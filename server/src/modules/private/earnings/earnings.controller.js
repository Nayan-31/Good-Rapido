import asyncHandler from '../../../shared/utils/asyncHandler.js';
import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';

export default class EarningsController {
    constructor(earningsService) {
        this.earningsService = earningsService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.earningsService.options(req.auth));
    });

    summary = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.earningsService.summary(req.auth, req.validatedQuery));
    });

    rides = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.earningsService.rides(req.auth, req.validatedQuery));
    });

    ride = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.earningsService.ride(req.auth, req.params.rideId));
    });

    statements = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.earningsService.statements(req.auth, req.validatedQuery));
    });

    simulate = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.earningsService.simulate(req.auth, req.body));
    });
}
