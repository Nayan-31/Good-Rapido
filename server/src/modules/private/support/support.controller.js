import asyncHandler from '../../../shared/utils/asyncHandler.js';
import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';

export default class PrivateSupportController {
    constructor(supportService) {
        this.supportService = supportService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.supportService.options(req.auth));
    });

    summary = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.supportService.summary(req.auth));
    });

    listTickets = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.supportService.listTickets(req.auth, req.validatedQuery));
    });

    createTicket = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.supportService.createTicket(req.auth, req.body));
    });

    getTicket = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.supportService.getTicket(req.auth, req.params.ticketId));
    });

    addMessage = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.supportService.addMessage(req.auth, req.params.ticketId, req.body));
    });

    closeTicket = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.supportService.closeTicket(req.auth, req.params.ticketId, req.body));
    });
}
