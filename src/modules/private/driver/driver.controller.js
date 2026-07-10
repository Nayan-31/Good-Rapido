import asyncHandler from '../../../shared/utils/asyncHandler.js';
import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';

export default class DriverController {
    constructor(driverService) {
        this.driverService = driverService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.driverService.options(req.auth));
    });

    getProfile = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driverService.getProfile(req.auth));
    });

    updateProfile = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driverService.updateProfile(req.auth, req.body));
    });

    getOnboarding = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driverService.getOnboarding(req.auth));
    });

    updateOnboarding = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driverService.updateOnboarding(req.auth, req.body));
    });

    submitOnboarding = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driverService.submitOnboarding(req.auth));
    });

    getAccount = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driverService.getAccount(req.auth));
    });

    updateAccountControls = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driverService.updateAccountControls(req.auth, req.body));
    });

    requestDeactivation = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driverService.requestDeactivation(req.auth, req.body));
    });
}
