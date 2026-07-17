import asyncHandler from '../../../shared/utils/asyncHandler.js';
import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';

export default class PrivateDisputesController {
    constructor(disputesService) {
        this.disputesService = disputesService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.disputesService.options(req.auth));
    });

    dashboard = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.disputesService.dashboard(req.auth));
    });

    queue = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.disputesService.queue(req.auth, req.validatedQuery));
    });

    detail = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.disputesService.detail(req.auth, req.params.disputeId));
    });

    updateState = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.disputesService.updateState(req.auth, req.params.disputeId, req.body));
    });

    assign = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.disputesService.assign(req.auth, req.params.disputeId, req.body));
    });

    requestEvidence = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.disputesService.requestEvidence(req.auth, req.params.disputeId, req.body));
    });

    addNote = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.disputesService.addNote(req.auth, req.params.disputeId, req.body));
    });

    resolve = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.disputesService.resolve(req.auth, req.params.disputeId, req.body));
    });

    reject = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.disputesService.reject(req.auth, req.params.disputeId, req.body));
    });
}
