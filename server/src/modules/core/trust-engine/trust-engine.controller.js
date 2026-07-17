import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';
import asyncHandler from '../../../shared/utils/asyncHandler.js';

export default class TrustEngineController {
    constructor(trustEngineService) {
        this.trustEngineService = trustEngineService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.trustEngineService.options(req.auth));
    });

    assess = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.trustEngineService.assess(req.auth, req.body));
    });

    evaluateDriver = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.trustEngineService.evaluateDriver(req.auth, req.body));
    });
}
