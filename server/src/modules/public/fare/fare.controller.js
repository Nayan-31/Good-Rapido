import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';
import asyncHandler from '../../../shared/utils/asyncHandler.js';

export default class FareController {
    constructor(fareService) {
        this.fareService = fareService;
    }

    createEstimate = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.fareService.createEstimate(req.auth, req.body));
    });

    getEstimate = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.fareService.getEstimate(req.auth, req.params.estimateId));
    });

    lockEstimate = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.fareService.lockEstimate(req.auth, req.params.estimateId));
    });

    history = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.fareService.history(req.auth, req.validatedQuery));
    });
}
