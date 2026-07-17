import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';
import asyncHandler from '../../../shared/utils/asyncHandler.js';

export default class PaymentEngineController {
    constructor(paymentEngineService) {
        this.paymentEngineService = paymentEngineService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.paymentEngineService.options(req.auth));
    });

    previewIntent = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.paymentEngineService.previewIntent(req.auth, req.body));
    });

    previewRefund = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.paymentEngineService.previewRefund(req.auth, req.body));
    });
}
