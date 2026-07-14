import asyncHandler from '../../../shared/utils/asyncHandler.js';
import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';

export default class PricingController {
    constructor(pricingService) {
        this.pricingService = pricingService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.pricingService.options(req.auth));
    });

    dashboard = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.pricingService.dashboard(req.auth));
    });

    listRules = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.pricingService.listRules(req.auth, req.validatedQuery));
    });

    getRule = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.pricingService.getRule(req.auth, req.params.ruleId));
    });

    createRule = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.pricingService.createRule(req.auth, req.body));
    });

    updateRule = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.pricingService.updateRule(req.auth, req.params.ruleId, req.body));
    });

    activateRule = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.pricingService.activateRule(req.auth, req.params.ruleId));
    });

    archiveRule = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.pricingService.archiveRule(req.auth, req.params.ruleId));
    });

    simulate = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.pricingService.simulate(req.auth, req.body));
    });
}
