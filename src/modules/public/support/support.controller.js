import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';
import asyncHandler from '../../../shared/utils/asyncHandler.js';

export default class SupportController {
    constructor(supportService) {
        this.supportService = supportService;
    }

    options = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.supportService.options(req.auth));
    });

    faqs = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.supportService.faqs(req.auth, req.validatedQuery));
    });

    getFaq = asyncHandler(async (req, res) => {
        sendHttpResponse(res, this.supportService.getFaq(req.auth, req.params.faqId));
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

    contact = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.supportService.contact(req.auth, req.body));
    });
}
