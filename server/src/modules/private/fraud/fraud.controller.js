import asyncHandler from '../../../shared/utils/asyncHandler.js';
import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';

export default class FraudController {
    constructor(fraudService) {
        this.fraudService = fraudService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.fraudService.options(req.auth));
    });

    dashboard = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.fraudService.dashboard(req.auth));
    });

    listCases = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.fraudService.listCases(req.auth, req.validatedQuery));
    });

    getCase = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.fraudService.getCase(req.auth, req.params.caseId));
    });

    createCase = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.fraudService.createCase(req.auth, req.body));
    });

    updateCase = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.fraudService.updateCase(req.auth, req.params.caseId, req.body));
    });

    assignReviewer = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.fraudService.assignReviewer(req.auth, req.params.caseId, req.body));
    });

    addNote = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.fraudService.addNote(req.auth, req.params.caseId, req.body));
    });

    confirmCase = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.fraudService.confirmCase(req.auth, req.params.caseId, req.body));
    });

    dismissCase = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.fraudService.dismissCase(req.auth, req.params.caseId, req.body));
    });

    resolveCase = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.fraudService.resolveCase(req.auth, req.params.caseId, req.body));
    });

    simulate = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.fraudService.simulate(req.auth, req.body));
    });
}
