import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import {
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import { createPrivateAuthGuard } from '../auth/session/auth-guard.middleware.js';
import PrivateTokenService from '../auth/session/token.service.js';
import DriverDocumentsController from './driver-documents.controller.js';
import DriverDocumentsDao from './driver-documents.dao.js';
import DriverDocumentsService from './driver-documents.service.js';
import {
    documentTypeParamSchema,
    driverDocumentReviewQueueSchema,
    reviewDriverDocumentSchema,
    uploadDriverDocumentSchema
} from './validators/driver-documents.validator.js';

const createDriverDocumentsDependencies = ({
    driverDocumentsDao = new DriverDocumentsDao(),
    tokenService = new PrivateTokenService(),
    now = () => new Date()
} = {}) => ({
    driverDocumentsDao,
    tokenService,
    now
});

export const createDriverDocumentsRouter = (dependencies = createDriverDocumentsDependencies()) => {
    const router = Router();
    const { driverDocumentsDao, tokenService, now } = dependencies;
    const driverDocumentsService = new DriverDocumentsService({ driverDocumentsDao, now });
    const driverDocumentsController = new DriverDocumentsController(driverDocumentsService);
    const requirePrivateAccess = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [
            PRIVATE_AUTH_ROLES.DRIVER,
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ]
    });
    const requireDriverDocumentsRead = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.DRIVER],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.DRIVER_DOCUMENTS_READ]
    });
    const requireDriverDocumentsWrite = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.DRIVER],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.DRIVER_DOCUMENTS_WRITE]
    });
    const requireDocumentReview = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.ADMIN, PRIVATE_AUTH_ROLES.OPS],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.DRIVER_DOCUMENTS_REVIEW]
    });

    router.get('/options', requirePrivateAccess, driverDocumentsController.options);
    router.get('/documents', requireDriverDocumentsRead, driverDocumentsController.getDocuments);
    router.put(
        '/documents/:documentType',
        requireDriverDocumentsWrite,
        validate(uploadDriverDocumentSchema),
        driverDocumentsController.upsertDocument
    );
    router.delete(
        '/documents/:documentType',
        requireDriverDocumentsWrite,
        validate(documentTypeParamSchema),
        driverDocumentsController.deleteDocument
    );
    router.post('/submit', requireDriverDocumentsWrite, driverDocumentsController.submitDocuments);
    router.get(
        '/review-queue',
        requireDocumentReview,
        validate(driverDocumentReviewQueueSchema),
        driverDocumentsController.getReviewQueue
    );
    router.patch(
        '/drivers/:driverId/documents/:documentType/review',
        requireDocumentReview,
        validate(reviewDriverDocumentSchema),
        driverDocumentsController.reviewDocument
    );

    return router;
};

export default createDriverDocumentsRouter();
