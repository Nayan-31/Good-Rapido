import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';
import asyncHandler from '../../../shared/utils/asyncHandler.js';

export default class PricingEngineController {
    constructor(pricingEngineService) {
        this.pricingEngineService = pricingEngineService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.pricingEngineService.options(req.auth));
    });

    quote = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.pricingEngineService.quote(req.auth, req.body));
    });

    compare = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.pricingEngineService.compare(req.auth, req.body));
    });
}
