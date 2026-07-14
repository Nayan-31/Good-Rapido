import asyncHandler from '../../../shared/utils/asyncHandler.js';
import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';

export default class TrustController {
    constructor(trustService) {
        this.trustService = trustService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.trustService.options(req.auth));
    });

    dashboard = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.trustService.dashboard(req.auth));
    });

    listProfiles = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.trustService.listProfiles(req.auth, req.validatedQuery));
    });

    getProfile = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.trustService.getProfile(req.auth, req.params.profileId));
    });

    createProfile = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.trustService.createProfile(req.auth, req.body));
    });

    updateProfile = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.trustService.updateProfile(req.auth, req.params.profileId, req.body));
    });

    assignReviewer = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.trustService.assignReviewer(req.auth, req.params.profileId, req.body));
    });

    addNote = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.trustService.addNote(req.auth, req.params.profileId, req.body));
    });

    resolveReview = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.trustService.resolveReview(req.auth, req.params.profileId, req.body));
    });

    simulate = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.trustService.simulate(req.auth, req.body));
    });
}
