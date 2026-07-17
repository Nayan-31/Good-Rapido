import asyncHandler from '../../../shared/utils/asyncHandler.js';
import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';

export default class DriverDocumentsController {
    constructor(driverDocumentsService) {
        this.driverDocumentsService = driverDocumentsService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.driverDocumentsService.options(req.auth));
    });

    getDocuments = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driverDocumentsService.getDocuments(req.auth));
    });

    upsertDocument = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driverDocumentsService.upsertDocument(
            req.auth,
            req.params.documentType,
            req.body
        ));
    });

    deleteDocument = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driverDocumentsService.deleteDocument(
            req.auth,
            req.params.documentType
        ));
    });

    submitDocuments = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driverDocumentsService.submitDocuments(req.auth));
    });

    getReviewQueue = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driverDocumentsService.getReviewQueue(req.auth, req.validatedQuery));
    });

    reviewDocument = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.driverDocumentsService.reviewDocument(
            req.auth,
            req.params.driverId,
            req.params.documentType,
            req.body
        ));
    });
}
