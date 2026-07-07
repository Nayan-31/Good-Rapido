import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import { createAuthGuard } from '../auth/session/auth-guard.middleware.js';
import TokenService from '../auth/session/token.service.js';
import SupportController from './support.controller.js';
import SupportDao from './support.dao.js';
import SupportService from './support.service.js';
import {
    addSupportMessageSchema,
    closeSupportTicketSchema,
    contactSupportSchema,
    createSupportTicketSchema,
    supportFaqParamsSchema,
    supportFaqQuerySchema,
    supportTicketParamsSchema,
    supportTicketQuerySchema
} from './validators/support.validator.js';

const createSupportDependencies = ({
    supportDao = new SupportDao(),
    tokenService = new TokenService(),
    now = () => new Date()
} = {}) => ({
    supportDao,
    tokenService,
    now
});

export const createSupportRouter = (dependencies = createSupportDependencies()) => {
    const router = Router();
    const { supportDao, tokenService, now } = dependencies;
    const supportService = new SupportService({ supportDao, now });
    const supportController = new SupportController(supportService);
    const requireAuth = createAuthGuard({
        tokenService,
        allowedRoles: Object.values(AUTH_ROLES)
    });

    router.use(requireAuth);

    router.get('/options', supportController.options);
    router.get('/faqs', validate(supportFaqQuerySchema), supportController.faqs);
    router.get('/faqs/:faqId', validate(supportFaqParamsSchema), supportController.getFaq);
    router.get('/summary', supportController.summary);
    router.get('/tickets', validate(supportTicketQuerySchema), supportController.listTickets);
    router.post('/tickets', validate(createSupportTicketSchema), supportController.createTicket);
    router.post('/contact', validate(contactSupportSchema), supportController.contact);
    router.post('/tickets/:ticketId/messages', validate(addSupportMessageSchema), supportController.addMessage);
    router.post('/tickets/:ticketId/close', validate(closeSupportTicketSchema), supportController.closeTicket);
    router.get('/tickets/:ticketId', validate(supportTicketParamsSchema), supportController.getTicket);

    return router;
};

export default createSupportRouter();
