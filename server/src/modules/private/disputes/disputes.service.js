import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import {
    DISPUTE_OPEN_STATUSES,
    DISPUTE_RESOLUTION_TYPES,
    DISPUTE_STATUSES
} from '../../public/disputes/disputes.constants.js';
import {
    PRIVATE_DISPUTE_ACTION_LOG_LIMIT,
    PRIVATE_DISPUTE_ACTIONS,
    PRIVATE_DISPUTE_DASHBOARD_LIMIT,
    PRIVATE_DISPUTE_DEFAULT_QUEUE_LIMIT
} from './disputes.constants.js';
import {
    toPrivateDisputeDashboard,
    toPrivateDisputeDetail,
    toPrivateDisputeOptions,
    toPrivateDisputeQueue
} from './dto/disputes.dto.js';

export default class PrivateDisputesService {
    constructor({ disputesDao, now = () => new Date() }) {
        this.disputesDao = disputesDao;
        this.now = now;
    }

    options(authContext) {
        this.assertDisputeReadContext(authContext);

        return buildSuccessResponse({
            message: 'Private dispute options fetched successfully',
            data: {
                options: toPrivateDisputeOptions()
            }
        });
    }

    async dashboard(authContext) {
        await this.getDisputeUserContext(authContext, { write: false });
        const disputes = toPlainArray(await this.disputesDao.findDashboardDisputes({
            limit: PRIVATE_DISPUTE_DASHBOARD_LIMIT
        })).map(normalizeDispute);

        return buildSuccessResponse({
            message: 'Private dispute dashboard fetched successfully',
            data: {
                dashboard: toPrivateDisputeDashboard(disputes)
            }
        });
    }

    async queue(authContext, query = {}) {
        await this.getDisputeUserContext(authContext, { write: false });
        const disputes = toPlainArray(await this.disputesDao.findDisputes({
            ...query,
            limit: query.limit || PRIVATE_DISPUTE_DEFAULT_QUEUE_LIMIT
        })).map(normalizeDispute);

        return buildSuccessResponse({
            message: 'Private dispute queue fetched successfully',
            data: {
                disputes: toPrivateDisputeQueue(disputes)
            }
        });
    }

    async detail(authContext, disputeId) {
        await this.getDisputeUserContext(authContext, { write: false });
        const dispute = await this.findDispute(disputeId);

        return buildSuccessResponse({
            message: 'Private dispute fetched successfully',
            data: {
                dispute: toPrivateDisputeDetail(dispute)
            }
        });
    }

    async updateState(authContext, disputeId, payload) {
        const actor = await this.getDisputeUserContext(authContext, { write: true });
        const dispute = await this.findDispute(disputeId);
        const note = trimToNull(payload.note);
        const updatedDispute = await this.updateDispute(disputeId, {
            ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
            ops: buildOpsState(dispute, {
                action: PRIVATE_DISPUTE_ACTIONS.UPDATE_STATE,
                note: note || 'Dispute state updated',
                actor,
                now: this.now(),
                assignedOpsUserId: payload.assignedOpsUserId
            }),
            latestActivityAt: this.now()
        });

        return buildSuccessResponse({
            message: 'Private dispute state updated successfully',
            data: {
                dispute: toPrivateDisputeDetail(updatedDispute)
            }
        });
    }

    async assign(authContext, disputeId, payload) {
        const actor = await this.getDisputeUserContext(authContext, { write: true });
        const dispute = await this.findDispute(disputeId);

        assertOpenDispute(dispute, 'Only open disputes can be assigned');

        const note = trimToNull(payload.note) || 'Dispute owner assigned';
        const now = this.now();
        const updatedDispute = await this.updateDispute(disputeId, {
            status: dispute.status === DISPUTE_STATUSES.SUBMITTED
                ? DISPUTE_STATUSES.UNDER_REVIEW
                : dispute.status,
            timeline: {
                ...dispute.timeline,
                acknowledgedAt: dispute.timeline?.acknowledgedAt || now
            },
            ops: buildOpsState(dispute, {
                action: PRIVATE_DISPUTE_ACTIONS.ASSIGN_OWNER,
                note,
                actor,
                now,
                assignedOpsUserId: payload.assignedOpsUserId
            }),
            latestActivityAt: now
        });

        return buildSuccessResponse({
            message: 'Private dispute owner assigned successfully',
            data: {
                dispute: toPrivateDisputeDetail(updatedDispute)
            }
        });
    }

    async requestEvidence(authContext, disputeId, payload) {
        const actor = await this.getDisputeUserContext(authContext, { write: true });
        const dispute = await this.findDispute(disputeId);

        if (![
            DISPUTE_STATUSES.SUBMITTED,
            DISPUTE_STATUSES.UNDER_REVIEW
        ].includes(dispute.status)) {
            throw AppError.badRequest('Only submitted or under review disputes can request evidence');
        }

        const note = trimToNull(payload.note);
        const now = this.now();
        const updatedDispute = await this.updateDispute(disputeId, {
            status: DISPUTE_STATUSES.EVIDENCE_REQUESTED,
            timeline: {
                ...dispute.timeline,
                acknowledgedAt: dispute.timeline?.acknowledgedAt || now,
                evidenceRequestedAt: now
            },
            ops: buildOpsState(dispute, {
                action: PRIVATE_DISPUTE_ACTIONS.REQUEST_EVIDENCE,
                note,
                actor,
                now
            }),
            latestActivityAt: now
        });

        return buildSuccessResponse({
            message: 'Dispute evidence requested successfully',
            data: {
                dispute: toPrivateDisputeDetail(updatedDispute)
            }
        });
    }

    async addNote(authContext, disputeId, payload) {
        const actor = await this.getDisputeUserContext(authContext, { write: true });
        const dispute = await this.findDispute(disputeId);
        const note = trimToNull(payload.note);
        const now = this.now();
        const updatedDispute = await this.updateDispute(disputeId, {
            ops: buildOpsState(dispute, {
                action: PRIVATE_DISPUTE_ACTIONS.ADD_NOTE,
                note,
                actor,
                now
            }),
            latestActivityAt: now
        });

        return buildSuccessResponse({
            message: 'Private dispute note added successfully',
            data: {
                dispute: toPrivateDisputeDetail(updatedDispute)
            }
        });
    }

    async resolve(authContext, disputeId, payload) {
        const actor = await this.getDisputeUserContext(authContext, { write: true });
        const dispute = await this.findDispute(disputeId);

        assertOpenDispute(dispute, 'Only open disputes can be resolved');

        const note = trimToNull(payload.note);
        const now = this.now();
        const updatedDispute = await this.updateDispute(disputeId, {
            status: DISPUTE_STATUSES.RESOLVED,
            timeline: {
                ...dispute.timeline,
                acknowledgedAt: dispute.timeline?.acknowledgedAt || now,
                resolvedAt: now
            },
            resolution: {
                type: payload.resolutionType,
                note,
                refundAmount: nullableMoney(payload.refundAmount),
                resolvedAt: now
            },
            ops: buildOpsState(dispute, {
                action: PRIVATE_DISPUTE_ACTIONS.RESOLVE_DISPUTE,
                note,
                actor,
                now
            }),
            latestActivityAt: now
        });

        return buildSuccessResponse({
            message: 'Private dispute resolved successfully',
            data: {
                dispute: toPrivateDisputeDetail(updatedDispute)
            }
        });
    }

    async reject(authContext, disputeId, payload) {
        const actor = await this.getDisputeUserContext(authContext, { write: true });
        const dispute = await this.findDispute(disputeId);

        assertOpenDispute(dispute, 'Only open disputes can be rejected');

        const note = trimToNull(payload.note);
        const now = this.now();
        const updatedDispute = await this.updateDispute(disputeId, {
            status: DISPUTE_STATUSES.REJECTED,
            timeline: {
                ...dispute.timeline,
                acknowledgedAt: dispute.timeline?.acknowledgedAt || now,
                resolvedAt: now
            },
            resolution: {
                type: DISPUTE_RESOLUTION_TYPES.REJECTED,
                note,
                refundAmount: null,
                resolvedAt: now
            },
            ops: buildOpsState(dispute, {
                action: PRIVATE_DISPUTE_ACTIONS.REJECT_DISPUTE,
                note,
                actor,
                now
            }),
            latestActivityAt: now
        });

        return buildSuccessResponse({
            message: 'Private dispute rejected successfully',
            data: {
                dispute: toPrivateDisputeDetail(updatedDispute)
            }
        });
    }

    async findDispute(disputeId) {
        const dispute = normalizeDispute(toPlainObject(await this.disputesDao.findById(disputeId)));

        if (!dispute) {
            throw AppError.notFound('Dispute not found');
        }

        return dispute;
    }

    async updateDispute(disputeId, payload) {
        const dispute = normalizeDispute(toPlainObject(await this.disputesDao.updateDispute(disputeId, payload)));

        if (!dispute) {
            throw AppError.notFound('Dispute not found');
        }

        return dispute;
    }

    async getDisputeUserContext(authContext, { write = false } = {}) {
        if (write) {
            this.assertDisputeWriteContext(authContext);
        } else {
            this.assertDisputeReadContext(authContext);
        }

        const privateUser = toPlainObject(await this.disputesDao.findPrivateUserById(authContext.userId));

        if (!privateUser) {
            throw AppError.notFound('Private user account not found');
        }

        if (privateUser.accountStatus !== PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`Private user account is ${privateUser.accountStatus}`);
        }

        return privateUser;
    }

    assertDisputeReadContext(authContext) {
        if (!authContext?.userId || ![
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ].includes(authContext.role)) {
            throw AppError.forbidden('Dispute private access is required');
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.OPS_DISPUTES_READ)) {
            throw AppError.forbidden('Dispute read permission is required');
        }

        return authContext;
    }

    assertDisputeWriteContext(authContext) {
        this.assertDisputeReadContext(authContext);

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.OPS_DISPUTES_WRITE)) {
            throw AppError.forbidden('Dispute write permission is required');
        }
    }
}

const buildOpsState = (dispute = {}, {
    action,
    note,
    actor,
    now,
    assignedOpsUserId
}) => ({
    ...normalizeOps(dispute.ops),
    ...(assignedOpsUserId !== undefined ? { assignedOpsUserId: assignedOpsUserId || null } : {}),
    lastAction: action,
    lastActionNote: note || null,
    lastActionAt: now,
    lastActionBy: getId(actor),
    actionLog: appendActionLog(dispute, {
        action,
        note,
        actor,
        now
    })
});

const appendActionLog = (dispute = {}, { action, note, actor, now }) => [
    ...(Array.isArray(dispute.ops?.actionLog) ? dispute.ops.actionLog : []).slice(-(PRIVATE_DISPUTE_ACTION_LOG_LIMIT - 1)),
    {
        action,
        note: note || null,
        actorId: getId(actor),
        actorRole: actor?.role || null,
        createdAt: now
    }
];

const normalizeDispute = (dispute) => {
    if (!dispute) {
        return null;
    }

    return {
        ...dispute,
        ops: normalizeOps(dispute.ops),
        evidence: Array.isArray(dispute.evidence) ? dispute.evidence : [],
        timeline: dispute.timeline || {},
        trustSignals: dispute.trustSignals || null
    };
};

const normalizeOps = (ops = {}) => ({
    assignedOpsUserId: ops.assignedOpsUserId || null,
    lastAction: ops.lastAction || null,
    lastActionNote: ops.lastActionNote || null,
    lastActionAt: ops.lastActionAt || null,
    lastActionBy: ops.lastActionBy || null,
    actionLog: Array.isArray(ops.actionLog) ? ops.actionLog : []
});

const assertOpenDispute = (dispute = {}, message) => {
    if (!DISPUTE_OPEN_STATUSES.includes(dispute.status)) {
        throw AppError.badRequest(message);
    }
};

const nullableMoney = (amount) => Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;

const trimToNull = (value) => {
    if (typeof value !== 'string') {
        return value || null;
    }

    return value.trim() || null;
};

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const toPlainArray = (documents = []) => documents.map((document) => toPlainObject(document));

const getId = (document = {}) => document._id?.toString?.() || document.id || null;
