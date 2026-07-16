import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';
import asyncHandler from '../../../shared/utils/asyncHandler.js';

export default class FraudEngineController {
    constructor(fraudEngineService) {
        this.fraudEngineService = fraudEngineService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.fraudEngineService.options(req.auth));
    });

    assess = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.fraudEngineService.assess(req.auth, req.body));
    });
}
