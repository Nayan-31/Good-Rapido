import asyncHandler from '../../../shared/utils/asyncHandler.js';
import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';

export default class PrivateNotificationsController {
    constructor(notificationsService) {
        this.notificationsService = notificationsService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.notificationsService.options(req.auth));
    });

    dashboard = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.notificationsService.dashboard(req.auth));
    });

    list = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.notificationsService.list(req.auth, req.validatedQuery));
    });

    detail = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.notificationsService.detail(req.auth, req.params.notificationId));
    });

    markRead = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.notificationsService.markRead(req.auth, req.params.notificationId));
    });

    create = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.notificationsService.create(req.auth, req.body));
    });

    send = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.notificationsService.send(req.auth, req.params.notificationId));
    });

    fail = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.notificationsService.fail(req.auth, req.params.notificationId, req.body));
    });

    retry = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.notificationsService.retry(req.auth, req.params.notificationId));
    });

    cancel = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.notificationsService.cancel(req.auth, req.params.notificationId, req.body));
    });
}
