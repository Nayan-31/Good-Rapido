import asyncHandler from '../../../shared/utils/asyncHandler.js';
import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';

export default class SurgeController {
    constructor(surgeService) {
        this.surgeService = surgeService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.surgeService.options(req.auth));
    });

    dashboard = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.surgeService.dashboard(req.auth));
    });

    listRules = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.surgeService.listRules(req.auth, req.validatedQuery));
    });

    getRule = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.surgeService.getRule(req.auth, req.params.ruleId));
    });

    createRule = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.surgeService.createRule(req.auth, req.body));
    });

    updateRule = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.surgeService.updateRule(req.auth, req.params.ruleId, req.body));
    });

    activateRule = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.surgeService.activateRule(req.auth, req.params.ruleId));
    });

    pauseRule = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.surgeService.pauseRule(req.auth, req.params.ruleId));
    });

    endRule = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.surgeService.endRule(req.auth, req.params.ruleId));
    });

    archiveRule = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.surgeService.archiveRule(req.auth, req.params.ruleId));
    });

    simulate = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.surgeService.simulate(req.auth, req.body));
    });
}
