import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';
import asyncHandler from '../../../shared/utils/asyncHandler.js';

export default class DriversController {
    constructor(driversService) {
        this.driversService = driversService;
    }

    list = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driversService.list(req.auth, req.validatedQuery));
    });

    getProfile = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driversService.getProfile(req.auth, req.params.driverId));
    });

    getTrustReport = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driversService.getTrustReport(req.auth, req.params.driverId));
    });

    getRouteFairness = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driversService.getRouteFairness(req.auth, req.params.driverId));
    });

    getCancellationRisk = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driversService.getCancellationRisk(req.auth, req.params.driverId));
    });
}
