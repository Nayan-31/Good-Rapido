import asyncHandler from '../../../shared/utils/asyncHandler.js';
import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';

export default class RideOpsController {
    constructor(rideOpsService) {
        this.rideOpsService = rideOpsService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.rideOpsService.options(req.auth));
    });

    dashboard = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.rideOpsService.dashboard(req.auth));
    });

    listRides = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.rideOpsService.listRides(req.auth, req.validatedQuery));
    });

    getRide = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.rideOpsService.getRide(req.auth, req.params.rideId));
    });

    updateOpsState = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.rideOpsService.updateOpsState(req.auth, req.params.rideId, req.body));
    });

    confirmRide = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.rideOpsService.confirmRide(req.auth, req.params.rideId, req.body));
    });

    reassignDriver = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.rideOpsService.reassignDriver(req.auth, req.params.rideId, req.body));
    });

    cancelRide = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.rideOpsService.cancelRide(req.auth, req.params.rideId, req.body));
    });
}
