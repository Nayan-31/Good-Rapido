import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';
import asyncHandler from '../../../shared/utils/asyncHandler.js';

export default class MatchingEngineController {
    constructor(matchingEngineService) {
        this.matchingEngineService = matchingEngineService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.matchingEngineService.options(req.auth));
    });

    match = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.matchingEngineService.match(req.auth, req.body));
    });
}
