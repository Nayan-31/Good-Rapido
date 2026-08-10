import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';
import asyncHandler from '../../../shared/utils/asyncHandler.js';

export default class PaymentsController {
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
    }

    listMethods = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.paymentsService.listMethods(req.auth));
    });

    getWallet = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.paymentsService.getWallet(req.auth));
    });

    history = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.paymentsService.history(req.auth, req.validatedQuery));
    });

    getPayment = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.paymentsService.getPayment(req.auth, req.params.paymentId));
    });

    payRide = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.paymentsService.payRide(req.auth, req.params.rideId, req.body));
    });

    confirmPaymentSuccess = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.paymentsService.confirmPaymentSuccess(req.auth, req.params.paymentId, req.body));
    });

    markPaymentFailed = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.paymentsService.markPaymentFailed(req.auth, req.params.paymentId, req.body));
    });

    requestRefund = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.paymentsService.requestRefund(req.auth, req.params.paymentId, req.body));
    });
}
