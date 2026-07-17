import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';
import asyncHandler from '../../../shared/utils/asyncHandler.js';

export default class RideBookingController {
    constructor(rideBookingService) {
        this.rideBookingService = rideBookingService;
    }

    search = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.rideBookingService.search(req.auth, req.body));
    });

    createBooking = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.rideBookingService.createBooking(req.auth, req.body));
    });

    getBooking = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.rideBookingService.getBooking(req.auth, req.params.bookingId));
    });

    selectDriver = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.rideBookingService.selectDriver(req.auth, req.params.bookingId, req.body.driverId));
    });

    confirmBooking = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.rideBookingService.confirmBooking(req.auth, req.params.bookingId));
    });

    cancelBooking = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.rideBookingService.cancelBooking(req.auth, req.params.bookingId, req.body));
    });
}
