import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';
import asyncHandler from '../../../shared/utils/asyncHandler.js';

export default class DisputesController {
    constructor(disputesService) {
        this.disputesService = disputesService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.disputesService.options(req.auth));
    });

    summary = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.disputesService.summary(req.auth));
    });

    history = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.disputesService.history(req.auth, req.validatedQuery));
    });

    getDispute = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.disputesService.getDispute(req.auth, req.params.disputeId));
    });

    getRideDisputes = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.disputesService.getRideDisputes(req.auth, req.params.rideId));
    });

    submitRideDispute = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.disputesService.submitRideDispute(req.auth, req.params.rideId, req.body));
    });

    addEvidence = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.disputesService.addEvidence(req.auth, req.params.disputeId, req.body));
    });

    cancelDispute = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.disputesService.cancelDispute(req.auth, req.params.disputeId, req.body));
    });
}
