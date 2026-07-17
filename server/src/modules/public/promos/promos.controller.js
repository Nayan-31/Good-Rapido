import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';
import asyncHandler from '../../../shared/utils/asyncHandler.js';

export default class PromosController {
    constructor(promosService) {
        this.promosService = promosService;
    }

    eligible = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.promosService.eligible(req.auth, req.validatedQuery));
    });

    referralCode = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.promosService.referralCode(req.auth));
    });

    history = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.promosService.history(req.auth, req.validatedQuery));
    });

    apply = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.promosService.apply(req.auth, req.body));
    });
}
