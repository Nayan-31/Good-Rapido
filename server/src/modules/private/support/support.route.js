import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import SupportDao from '../../public/support/support.dao.js';
import {
    addSupportMessageSchema,
    closeSupportTicketSchema,
    createSupportTicketSchema,
    supportTicketParamsSchema,
    supportTicketQuerySchema
} from '../../public/support/validators/support.validator.js';
import { PRIVATE_AUTH_ROLES } from '../auth/auth.constants.js';
import { createPrivateAuthGuard } from '../auth/session/auth-guard.middleware.js';
import PrivateTokenService from '../auth/session/token.service.js';
import PrivateSupportController from './support.controller.js';
import PrivateSupportService from './support.service.js';

const createPrivateSupportDependencies = ({
    supportDao = new SupportDao(),
    tokenService = new PrivateTokenService(),
    now = () => new Date()
} = {}) => ({
    supportDao,
    tokenService,
    now
});

export const createPrivateSupportRouter = (dependencies = createPrivateSupportDependencies()) => {
    const router = Router();
    const { supportDao, tokenService, now } = dependencies;
    const supportService = new PrivateSupportService({ supportDao, now });
    const supportController = new PrivateSupportController(supportService);
    const requirePrivateSupport = createPrivateAuthGuard({
        tokenService,
        allowedRoles: Object.values(PRIVATE_AUTH_ROLES)
    });

    router.use(requirePrivateSupport);

    router.get('/options', supportController.options);
    router.get('/summary', supportController.summary);
    router.get('/tickets', validate(supportTicketQuerySchema), supportController.listTickets);
    router.post('/tickets', validate(createSupportTicketSchema), supportController.createTicket);
    router.post('/tickets/:ticketId/messages', validate(addSupportMessageSchema), supportController.addMessage);
    router.post('/tickets/:ticketId/close', validate(closeSupportTicketSchema), supportController.closeTicket);
    router.get('/tickets/:ticketId', validate(supportTicketParamsSchema), supportController.getTicket);

    return router;
};

export default createPrivateSupportRouter();
