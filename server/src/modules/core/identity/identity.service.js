import { AUTH_ACCOUNT_STATUSES } from '../../public/auth/auth.constants.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../../private/auth/auth.constants.js';
import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    IDENTITY_DOCUMENT_STATUSES,
    IDENTITY_REQUIRED_DOCUMENTS_BY_ROLE,
    IDENTITY_REVIEW_DECISIONS,
    IDENTITY_SCOPES,
    IDENTITY_STATUSES
} from './identity.constants.js';
import {
    toIdentityOptions,
    toIdentityReviewQueue,
    toIdentityVerification
} from './dto/identity.dto.js';

export default class IdentityService {
    constructor({ identityDao, now = () => new Date() }) {
        this.identityDao = identityDao;
        this.now = now;
    }

    options(authContext) {
        this.assertAuthenticatedContext(authContext);

        return buildSuccessResponse({
            message: 'Identity options fetched successfully',
            data: {
                options: toIdentityOptions()
            }
        });
    }

    async getMyIdentity(authContext) {
        const subject = await this.getSubjectContext(authContext);
        const identity = normalizeIdentity(toPlainObject(await this.identityDao.findBySubject(
            subject.scope,
            subject.role,
            subject.id
        ))) || buildDraftIdentity(subject);

        return buildSuccessResponse({
            message: 'Identity verification fetched successfully',
            data: {
                identity: toIdentityVerification(identity)
            }
        });
    }

    async upsertMyIdentity(authContext, payload) {
        const subject = await this.getSubjectContext(authContext);
        const existingIdentity = normalizeIdentity(toPlainObject(await this.identityDao.findBySubject(
            subject.scope,
            subject.role,
            subject.id
        )));

        if (existingIdentity) {
            assertIdentityEditable(existingIdentity);
        }

        const now = this.now();
        const nextPayload = {
            ...toSubjectPayload(subject),
            status: IDENTITY_STATUSES.DRAFT,
            documents: payload.documents.map((document) => toUploadedDocument(document, now)),
            submittedAt: null,
            reviewedAt: null,
            reviewedBy: null,
            rejectionReason: null
        };
        const identity = existingIdentity
            ? await this.identityDao.updateBySubject(subject.scope, subject.role, subject.id, nextPayload)
            : await this.identityDao.create(nextPayload);

        return buildSuccessResponse({
            statusCode: existingIdentity ? 200 : 201,
            message: 'Identity documents saved successfully',
            data: {
                identity: toIdentityVerification(normalizeIdentity(toPlainObject(identity)))
            }
        });
    }

    async submitMyIdentity(authContext) {
        const subject = await this.getSubjectContext(authContext);
        const existingIdentity = normalizeIdentity(toPlainObject(await this.identityDao.findBySubject(
            subject.scope,
            subject.role,
            subject.id
        )));

        if (!existingIdentity) {
            throw AppError.badRequest('Upload identity documents before submitting');
        }

        assertIdentityEditable(existingIdentity);

        const missingTypes = findMissingRequiredDocuments(existingIdentity);

        if (missingTypes.length) {
            throw AppError.badRequest(`Upload required identity documents before submitting: ${missingTypes.join(', ')}`);
        }

        const now = this.now();
        const updatedIdentity = normalizeIdentity(toPlainObject(await this.identityDao.updateBySubject(
            subject.scope,
            subject.role,
            subject.id,
            {
                ...toSubjectPayload(subject),
                status: IDENTITY_STATUSES.SUBMITTED,
                documents: existingIdentity.documents.map((document) => ({
                    ...document,
                    status: IDENTITY_DOCUMENT_STATUSES.UPLOADED,
                    reviewedAt: null,
                    reviewedBy: null,
                    rejectionReason: null
                })),
                submittedAt: now,
                reviewedAt: null,
                reviewedBy: null,
                rejectionReason: null
            }
        )));

        return buildSuccessResponse({
            message: 'Identity submitted for review successfully',
            data: {
                identity: toIdentityVerification(updatedIdentity)
            }
        });
    }

    async getIdentity(authContext, identityId) {
        await this.getReviewerContext(authContext, { write: false });
        const identity = await this.findIdentity(identityId);

        return buildSuccessResponse({
            message: 'Identity verification fetched successfully',
            data: {
                identity: toIdentityVerification(identity)
            }
        });
    }

    async getReviewQueue(authContext, query = {}) {
        await this.getReviewerContext(authContext, { write: false });
        const identities = toPlainArray(await this.identityDao.findReviewQueue({
            status: query.status || IDENTITY_STATUSES.SUBMITTED,
            subjectRole: query.subjectRole,
            limit: query.limit || 25
        })).map(normalizeIdentity);

        return buildSuccessResponse({
            message: 'Identity review queue fetched successfully',
            data: {
                reviewQueue: toIdentityReviewQueue(identities)
            }
        });
    }

    async reviewIdentity(authContext, identityId, payload) {
        const reviewer = await this.getReviewerContext(authContext, { write: true });
        const identity = await this.findIdentity(identityId);

        if (identity.status !== IDENTITY_STATUSES.SUBMITTED) {
            throw AppError.badRequest('Only submitted identity verifications can be reviewed');
        }

        const now = this.now();
        const reviewedIdentity = normalizeIdentity(toPlainObject(await this.identityDao.updateById(
            identityId,
            {
                status: payload.status,
                documents: reviewDocuments(identity.documents, payload, {
                    reviewerId: getId(reviewer),
                    now
                }),
                reviewedAt: now,
                reviewedBy: getId(reviewer),
                rejectionReason: payload.status === IDENTITY_REVIEW_DECISIONS.REJECTED
                    ? payload.rejectionReason.trim()
                    : null
            }
        )));

        if (!reviewedIdentity) {
            throw AppError.notFound('Identity verification not found');
        }

        return buildSuccessResponse({
            message: 'Identity verification reviewed successfully',
            data: {
                identity: toIdentityVerification(reviewedIdentity)
            }
        });
    }

    async findIdentity(identityId) {
        const identity = normalizeIdentity(toPlainObject(await this.identityDao.findById(identityId)));

        if (!identity) {
            throw AppError.notFound('Identity verification not found');
        }

        return identity;
    }

    async getSubjectContext(authContext) {
        this.assertAuthenticatedContext(authContext);

        const user = authContext.scope === IDENTITY_SCOPES.PRIVATE
            ? toPlainObject(await this.identityDao.findPrivateUserById(authContext.userId))
            : toPlainObject(await this.identityDao.findPublicUserById(authContext.userId));

        if (!user) {
            throw AppError.notFound('Identity account not found');
        }

        if (authContext.scope === IDENTITY_SCOPES.PRIVATE && user.accountStatus !== PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`Private account is ${user.accountStatus}`);
        }

        if (authContext.scope === IDENTITY_SCOPES.PUBLIC && user.accountStatus !== AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`Account is ${user.accountStatus}`);
        }

        return {
            id: getId(user),
            scope: authContext.scope,
            role: authContext.role,
            fullName: user.fullName,
            email: user.email || null,
            phone: user.phone || null
        };
    }

    async getReviewerContext(authContext, { write = false } = {}) {
        if (write) {
            this.assertReviewerWriteContext(authContext);
        } else {
            this.assertReviewerReadContext(authContext);
        }

        const privateUser = toPlainObject(await this.identityDao.findPrivateUserById(authContext.userId));

        if (!privateUser) {
            throw AppError.notFound('Identity reviewer account not found');
        }

        if (privateUser.accountStatus !== PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`Identity reviewer account is ${privateUser.accountStatus}`);
        }

        return privateUser;
    }

    assertAuthenticatedContext(authContext) {
        if (!authContext?.userId || !authContext?.role || !authContext?.scope) {
            throw AppError.unauthorized();
        }
    }

    assertReviewerReadContext(authContext) {
        this.assertAuthenticatedContext(authContext);

        if (authContext.scope !== IDENTITY_SCOPES.PRIVATE || ![
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ].includes(authContext.role)) {
            throw AppError.forbidden('Identity review access is restricted to private reviewers');
        }

        if (!hasPermission(authContext.permissions, PRIVATE_AUTH_PERMISSIONS.TRUST_READ)) {
            throw AppError.forbidden('Trust read permission is required for identity review');
        }
    }

    assertReviewerWriteContext(authContext) {
        this.assertReviewerReadContext(authContext);

        if (!hasPermission(authContext.permissions, PRIVATE_AUTH_PERMISSIONS.TRUST_WRITE)) {
            throw AppError.forbidden('Trust write permission is required for identity review');
        }
    }
}

const buildDraftIdentity = (subject) => ({
    ...toSubjectPayload(subject),
    status: IDENTITY_STATUSES.DRAFT,
    documents: [],
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null
});

const toSubjectPayload = (subject) => ({
    subjectScope: subject.scope,
    subjectRole: subject.role,
    subjectId: subject.id,
    fullName: subject.fullName,
    email: subject.email,
    phone: subject.phone
});

const toUploadedDocument = (document, now) => ({
    type: document.type,
    status: IDENTITY_DOCUMENT_STATUSES.UPLOADED,
    documentNumber: trimToNull(document.documentNumber),
    holderName: trimToNull(document.holderName),
    fileUrl: document.fileUrl,
    backFileUrl: trimToNull(document.backFileUrl),
    issuedAt: document.issuedAt || null,
    expiresAt: document.expiresAt || null,
    uploadedAt: now,
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    notes: trimToNull(document.notes)
});

const reviewDocuments = (documents = [], payload, { reviewerId, now }) => {
    const reviewByType = new Map((payload.documentReviews || []).map((review) => [review.type, review]));

    return documents.map((document) => {
        const review = reviewByType.get(document.type);
        const nextStatus = resolveDocumentStatus(document, payload, review);

        return {
            ...document,
            status: nextStatus,
            reviewedAt: now,
            reviewedBy: reviewerId,
            rejectionReason: nextStatus === IDENTITY_DOCUMENT_STATUSES.REJECTED
                ? (review?.rejectionReason || payload.rejectionReason || 'Identity rejected').trim()
                : null
        };
    });
};

const resolveDocumentStatus = (document, payload, review) => {
    if (payload.status === IDENTITY_REVIEW_DECISIONS.VERIFIED) {
        return IDENTITY_DOCUMENT_STATUSES.APPROVED;
    }

    if (review?.status) {
        return review.status;
    }

    return payload.documentReviews?.length
        ? document.status
        : IDENTITY_DOCUMENT_STATUSES.REJECTED;
};

const assertIdentityEditable = (identity) => {
    if (![
        IDENTITY_STATUSES.DRAFT,
        IDENTITY_STATUSES.REJECTED
    ].includes(identity.status)) {
        throw AppError.badRequest('Identity verification cannot be edited after submission or verification');
    }
};

const findMissingRequiredDocuments = (identity) => {
    const requiredTypes = IDENTITY_REQUIRED_DOCUMENTS_BY_ROLE[identity.subjectRole] || [];
    const uploadedTypes = new Set((identity.documents || []).map((document) => document.type));

    return requiredTypes.filter((type) => !uploadedTypes.has(type));
};

const normalizeIdentity = (identity) => identity ? {
    ...identity,
    documents: Array.isArray(identity.documents) ? identity.documents : []
} : null;

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const toPlainArray = (documents = []) => documents.map(toPlainObject);

const hasPermission = (permissions = [], permission) => Array.isArray(permissions) && permissions.includes(permission);

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const trimToNull = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
