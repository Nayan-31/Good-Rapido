import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';
import asyncHandler from '../../../shared/utils/asyncHandler.js';

export default class NotificationsController {
    constructor(notificationsService) {
        this.notificationsService = notificationsService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.notificationsService.options(req.auth));
    });

    summary = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.notificationsService.summary(req.auth));
    });

    list = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.notificationsService.list(req.auth, req.validatedQuery));
    });

    getNotification = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.notificationsService.getNotification(req.auth, req.params.notificationId));
    });

    markRead = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.notificationsService.markRead(req.auth, req.params.notificationId));
    });

    markAllRead = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.notificationsService.markAllRead(req.auth, req.body));
    });

    archive = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.notificationsService.archive(req.auth, req.params.notificationId));
    });

    getPreferences = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.notificationsService.getPreferences(req.auth));
    });

    updatePreferences = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.notificationsService.updatePreferences(req.auth, req.body));
    });

    registerDevice = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.notificationsService.registerDevice(req.auth, req.body));
    });
}
