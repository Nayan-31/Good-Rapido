import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';
import asyncHandler from '../../../shared/utils/asyncHandler.js';

export default class IdentityController {
    constructor(identityService) {
        this.identityService = identityService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.identityService.options(req.auth));
    });

    me = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.identityService.getMyIdentity(req.auth));
    });

    upsertMe = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.identityService.upsertMyIdentity(req.auth, req.body));
    });

    submitMe = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.identityService.submitMyIdentity(req.auth));
    });

    getIdentity = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.identityService.getIdentity(req.auth, req.params.identityId));
    });

    getReviewQueue = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.identityService.getReviewQueue(req.auth, req.validatedQuery));
    });

    reviewIdentity = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.identityService.reviewIdentity(req.auth, req.params.identityId, req.body));
    });
}
