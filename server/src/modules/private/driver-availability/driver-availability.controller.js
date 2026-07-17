import asyncHandler from '../../../shared/utils/asyncHandler.js';
import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';

export default class DriverAvailabilityController {
    constructor(driverAvailabilityService) {
        this.driverAvailabilityService = driverAvailabilityService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.driverAvailabilityService.options(req.auth));
    });

    getStatus = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driverAvailabilityService.getStatus(req.auth));
    });

    updateStatus = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driverAvailabilityService.updateStatus(req.auth, req.body));
    });

    updateLocation = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driverAvailabilityService.updateLocation(req.auth, req.body));
    });

    updateZones = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driverAvailabilityService.updateZones(req.auth, req.body));
    });
}
