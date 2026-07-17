import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';
import asyncHandler from '../../../shared/utils/asyncHandler.js';

export default class RidesController {
    constructor(ridesService) {
        this.ridesService = ridesService;
    }

    current = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.ridesService.current(req.auth));
    });

    history = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.ridesService.history(req.auth, req.validatedQuery));
    });

    getRide = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.ridesService.getRide(req.auth, req.params.rideId));
    });

    getReceipt = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.ridesService.getReceipt(req.auth, req.params.rideId));
    });
}
