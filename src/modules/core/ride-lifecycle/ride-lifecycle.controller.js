import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';
import asyncHandler from '../../../shared/utils/asyncHandler.js';

export default class RideLifecycleController {
    constructor(rideLifecycleService) {
        this.rideLifecycleService = rideLifecycleService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.rideLifecycleService.options(req.auth));
    });

    getRideLifecycle = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.rideLifecycleService.getRideLifecycle(req.auth, req.params.rideId));
    });

    transitionRide = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.rideLifecycleService.transitionRide(req.auth, req.params.rideId, req.body));
    });
}
