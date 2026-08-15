import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';
import asyncHandler from '../../../shared/utils/asyncHandler.js';

export default class LocationSearchController {
    constructor(locationSearchService) {
        this.locationSearchService = locationSearchService;
    }

    search = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.locationSearchService.search(req.validatedQuery));
    });

    resolve = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.locationSearchService.resolve({
            placeId: req.params.placeId,
            sessionToken: req.validatedQuery?.sessionToken
        }));
    });
}
