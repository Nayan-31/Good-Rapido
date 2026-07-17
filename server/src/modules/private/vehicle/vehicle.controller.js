import asyncHandler from '../../../shared/utils/asyncHandler.js';
import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';

export default class VehicleController {
    constructor(vehicleService) {
        this.vehicleService = vehicleService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.vehicleService.options(req.auth));
    });

    getVehicles = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.vehicleService.getVehicles(req.auth));
    });

    createVehicle = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.vehicleService.createVehicle(req.auth, req.body));
    });

    updateVehicle = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.vehicleService.updateVehicle(req.auth, req.params.vehicleId, req.body));
    });

    deleteVehicle = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.vehicleService.deleteVehicle(req.auth, req.params.vehicleId));
    });

    setPrimaryVehicle = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.vehicleService.setPrimaryVehicle(req.auth, req.params.vehicleId));
    });

    submitVehicle = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.vehicleService.submitVehicle(req.auth, req.params.vehicleId));
    });

    getReviewQueue = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.vehicleService.getReviewQueue(req.auth, req.validatedQuery));
    });

    reviewVehicle = asyncHandler(async (req, res) => {
        sendHttpResponse(
            res,
            await this.vehicleService.reviewVehicle(req.auth, req.params.driverId, req.params.vehicleId, req.body)
        );
    });
}
