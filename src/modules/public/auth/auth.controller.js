import asyncHandler from '../../../shared/utils/asyncHandler.js';
import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';

export default class AuthController {
    constructor(authService) {
        this.authService = authService;
    }

    register = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.authService.register(req.body));
    });

    login = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.authService.login(req.body));
    });

    refresh = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.authService.refresh(req.body, req.cookies));
    });

    logout = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.authService.logout(req.body, req.cookies));
    });

    me = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.authService.me(req.auth));
    });
}

/**
 * auth.controller.js  = HTTP request/response bridge
 */