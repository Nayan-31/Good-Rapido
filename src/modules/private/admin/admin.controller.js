import asyncHandler from '../../../shared/utils/asyncHandler.js';
import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';

export default class AdminController {
    constructor(adminService) {
        this.adminService = adminService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.adminService.options(req.auth));
    });

    dashboard = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.adminService.dashboard(req.auth));
    });

    listUsers = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.adminService.listUsers(req.auth, req.validatedQuery));
    });

    createUser = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.adminService.createUser(req.auth, req.body));
    });

    getUser = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.adminService.getUser(req.auth, req.params.userId));
    });

    updateUser = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.adminService.updateUser(req.auth, req.params.userId, req.body));
    });

    updateUserStatus = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.adminService.updateUserStatus(req.auth, req.params.userId, req.body));
    });

    updateUserPermissions = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.adminService.updateUserPermissions(req.auth, req.params.userId, req.body));
    });
}
