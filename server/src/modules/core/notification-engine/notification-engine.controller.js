import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';
import asyncHandler from '../../../shared/utils/asyncHandler.js';

export default class NotificationEngineController {
    constructor(notificationEngineService) {
        this.notificationEngineService = notificationEngineService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.notificationEngineService.options(req.auth));
    });

    planDelivery = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.notificationEngineService.planDelivery(req.auth, req.body));
    });

    compose = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.notificationEngineService.compose(req.auth, req.body));
    });
}
