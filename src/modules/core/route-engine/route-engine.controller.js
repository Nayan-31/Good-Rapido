import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';
import asyncHandler from '../../../shared/utils/asyncHandler.js';

export default class RouteEngineController {
    constructor(routeEngineService) {
        this.routeEngineService = routeEngineService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.routeEngineService.options(req.auth));
    });

    plan = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.routeEngineService.plan(req.auth, req.body));
    });
}
