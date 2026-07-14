import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import { RIDE_BOOKING_STATUSES } from '../../public/ride-booking/ride-booking.constants.js';
import {
    PAYMENT_METHODS,
    PAYMENT_STATUSES
} from '../../public/payments/payments.constants.js';
import {
    EARNINGS_CURRENCY,
    EARNINGS_DEFAULT_DRIVER_SHARE_RATE,
    EARNINGS_DEFAULT_LIST_LIMIT,
    EARNINGS_DEFAULT_PLATFORM_FEE_RATE,
    EARNINGS_DEFAULT_SURGE_INCENTIVE_RATE,
    EARNINGS_MAX_LIST_LIMIT,
    EARNINGS_PERIODS,
    EARNINGS_STATEMENT_PERIODS,
    EARNINGS_STATUSES
} from './earnings.constants.js';
import {
    toEarningRide,
    toEarningRideList,
    toEarningsOptions,
    toEarningsSummary,
    toEarningSimulation,
    toEarningStatements
} from './dto/earnings.dto.js';

export default class EarningsService {
    constructor({ earningsDao, now = () => new Date() }) {
        this.earningsDao = earningsDao;
        this.now = now;
    }

    options(authContext) {
        this.assertEarningsReadContext(authContext);

        return buildSuccessResponse({
            message: 'Earnings options fetched successfully',
            data: {
                options: toEarningsOptions()
            }
        });
    }

    async summary(authContext, query = {}) {
        const { driver } = await this.getDriverContext(authContext);
        const window = resolvePeriodWindow(query, this.now());
        const items = await this.findEarningItems(driver.driverId, {
            ...query,
            ...window,
            limit: EARNINGS_MAX_LIST_LIMIT
        });

        return buildSuccessResponse({
            message: 'Earnings summary fetched successfully',
            data: {
                earnings: toEarningsSummary({
                    driver,
                    window,
                    items
                })
            }
        });
    }

    async rides(authContext, query = {}) {
        const { driver } = await this.getDriverContext(authContext);
        const window = resolvePeriodWindow(query, this.now());
        const items = await this.findEarningItems(driver.driverId, {
            ...query,
            ...window,
            limit: query.limit || EARNINGS_DEFAULT_LIST_LIMIT
        });
        const filteredItems = filterByStatus(items, query.status);

        return buildSuccessResponse({
            message: 'Earning rides fetched successfully',
            data: {
                earnings: toEarningRideList({
                    driver,
                    window,
                    items: filteredItems
                })
            }
        });
    }

    async ride(authContext, rideId) {
        const { driver } = await this.getDriverContext(authContext);
        const ride = toPlainObject(await this.earningsDao.findRideByIdForDriver(rideId, driver.driverId));

        if (!ride) {
            throw AppError.notFound('Earning ride not found');
        }

        const payments = toPlainArray(await this.earningsDao.findPaymentsForRideIds([getId(ride)]));
        const item = buildEarningItem(ride, payments[0], {
            now: this.now()
        });

        return buildSuccessResponse({
            message: 'Earning ride fetched successfully',
            data: {
                ride: toEarningRide(item)
            }
        });
    }

    async statements(authContext, query = {}) {
        const { driver } = await this.getDriverContext(authContext);
        const window = resolvePeriodWindow(query, this.now());
        const items = await this.findEarningItems(driver.driverId, {
            ...query,
            ...window,
            limit: query.limit || EARNINGS_DEFAULT_LIST_LIMIT
        });
        const statements = groupEarningStatements(items, query.groupBy || EARNINGS_STATEMENT_PERIODS.WEEKLY);

        return buildSuccessResponse({
            message: 'Earning statements fetched successfully',
            data: {
                earnings: toEarningStatements({
                    driver,
                    window,
                    statements
                })
            }
        });
    }

    async simulate(authContext, payload) {
        await this.getDriverContext(authContext);
        const components = buildEarningComponents({
            grossFare: payload.fareAmount,
            tipAmount: payload.tipAmount || 0,
            surgeMultiplier: payload.surgeMultiplier || 1,
            platformFeeRate: payload.platformFeeRate ?? EARNINGS_DEFAULT_PLATFORM_FEE_RATE,
            incentiveAmount: payload.incentiveAmount,
            deductionAmount: payload.deductionAmount || 0,
            status: payload.status || EARNINGS_STATUSES.AVAILABLE
        });

        return buildSuccessResponse({
            message: 'Earning simulation completed successfully',
            data: toEarningSimulation({
                fare: {
                    currency: EARNINGS_CURRENCY,
                    grossFare: payload.fareAmount,
                    surgeMultiplier: payload.surgeMultiplier || 1
                },
                components,
                status: payload.status || EARNINGS_STATUSES.AVAILABLE,
                guidance: buildSimulationGuidance(components)
            })
        });
    }

    async findEarningItems(driverId, query = {}) {
        const rides = toPlainArray(await this.earningsDao.findEarningRides({
            driverId,
            from: query.from,
            to: query.to,
            limit: query.limit || EARNINGS_DEFAULT_LIST_LIMIT
        }));
        const rideIds = rides.map(getId).filter(Boolean);
        const payments = toPlainArray(await this.earningsDao.findPaymentsForRideIds(rideIds));
        const paymentMap = new Map(payments.map((payment) => [toId(payment.rideId), payment]));

        return rides.map((ride) => buildEarningItem(ride, paymentMap.get(getId(ride)), {
            now: this.now()
        }));
    }

    async getDriverContext(authContext) {
        this.assertEarningsReadContext(authContext);
        const authUser = toPlainObject(await this.earningsDao.findAuthUserById(authContext.userId));

        if (!authUser) {
            throw AppError.notFound('Driver account not found');
        }

        if (authUser.accountStatus !== PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`Driver account is ${authUser.accountStatus}`);
        }

        const driverProfile = toPlainObject(await this.earningsDao.findProfileByAuthUserId(authContext.userId));

        if (!driverProfile) {
            throw AppError.notFound('Driver profile not found');
        }

        return {
            authUser,
            driverProfile,
            driver: normalizeDriver(authUser, driverProfile)
        };
    }

    assertEarningsReadContext(authContext) {
        if (!authContext?.userId || authContext.role !== PRIVATE_AUTH_ROLES.DRIVER) {
            throw AppError.forbidden('Driver earnings private access is required');
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.DRIVER_EARNINGS_READ)) {
            throw AppError.forbidden('Driver earnings read permission is required');
        }

        return authContext;
    }
}

const buildEarningItem = (ride = {}, payment = {}, { now }) => {
    const timeline = buildRideTimeline(ride);
    const lifecycleStatus = resolveLifecycleStatus(ride, timeline, now);
    const status = resolveEarningStatus({
        lifecycleStatus,
        ride,
        payment
    });
    const grossFare = lifecycleStatus === 'cancelled' ? 0 : numberOrZero(ride.fareSnapshot?.totalFare);
    const components = buildEarningComponents({
        grossFare,
        tipAmount: numberOrZero(payment?.tipAmount),
        surgeMultiplier: ride.fareSnapshot?.surgeMultiplier || 1,
        deductionAmount: resolveDeductionAmount(payment),
        status
    });

    return {
        rideId: getId(ride),
        bookingCode: ride.bookingCode,
        status,
        vehicleType: ride.vehicleType,
        pickup: ride.pickup,
        dropoff: ride.dropoff,
        paymentMethod: ride.paymentMethod,
        fare: {
            currency: ride.fareSnapshot?.currency || EARNINGS_CURRENCY,
            totalFare: numberOrZero(ride.fareSnapshot?.totalFare),
            distanceKm: numberOrZero(ride.fareSnapshot?.distanceKm),
            durationMinutes: numberOrZero(ride.fareSnapshot?.durationMinutes),
            surgeMultiplier: ride.fareSnapshot?.surgeMultiplier || 1
        },
        payment: {
            paymentId: getId(payment),
            paymentCode: payment?.paymentCode || null,
            method: payment?.method || ride.paymentMethod || null,
            status: payment?.status || null,
            amount: numberOrZero(payment?.amount),
            tipAmount: numberOrZero(payment?.tipAmount),
            discountAmount: numberOrZero(payment?.discountAmount),
            capturedAt: payment?.capturedAt || null,
            refundableUntil: payment?.refundableUntil || null,
            refundAmount: numberOrZero(payment?.refund?.amount)
        },
        components,
        timeline: {
            bookedAt: ride.createdAt || null,
            confirmedAt: timeline.confirmedAt,
            completedAt: lifecycleStatus === 'completed' ? timeline.estimatedDropoffAt : null,
            cancelledAt: ride.cancellation?.cancelledAt || null
        },
        trustSummary: {
            driverTrustScore: ride.trustSignals?.driverTrustScore || null,
            fairPriceScore: ride.trustSignals?.fairPriceScore || null,
            routeAccuracyScore: ride.trustSignals?.routeAccuracyScore || null
        },
        guidance: resolveEarningGuidance(status)
    };
};

const buildEarningComponents = ({
    grossFare,
    tipAmount = 0,
    surgeMultiplier = 1,
    platformFeeRate = EARNINGS_DEFAULT_PLATFORM_FEE_RATE,
    incentiveAmount,
    deductionAmount = 0,
    status
}) => {
    if ([EARNINGS_STATUSES.CANCELLED, EARNINGS_STATUSES.REFUNDED].includes(status)) {
        return {
            grossFare: roundMoney(grossFare),
            platformFee: 0,
            driverFare: 0,
            incentiveAmount: 0,
            tipAmount: 0,
            deductionAmount: roundMoney(deductionAmount),
            netEarning: 0,
            driverShareRate: EARNINGS_DEFAULT_DRIVER_SHARE_RATE,
            platformFeeRate
        };
    }

    const platformFee = roundMoney(grossFare * platformFeeRate);
    const driverFare = roundMoney(Math.max(0, grossFare - platformFee));
    const surgeIncentive = incentiveAmount ?? resolveSurgeIncentive(grossFare, surgeMultiplier);
    const netBeforeDeductions = driverFare + tipAmount + surgeIncentive;
    const appliedDeduction = Math.min(deductionAmount, netBeforeDeductions);

    return {
        grossFare: roundMoney(grossFare),
        platformFee,
        driverFare,
        incentiveAmount: roundMoney(surgeIncentive),
        tipAmount: roundMoney(tipAmount),
        deductionAmount: roundMoney(appliedDeduction),
        netEarning: roundMoney(netBeforeDeductions - appliedDeduction),
        driverShareRate: roundMoney(1 - platformFeeRate),
        platformFeeRate
    };
};

const resolvePeriodWindow = (query = {}, now = new Date()) => {
    const period = query.period || EARNINGS_PERIODS.THIS_WEEK;
    const endOfWindow = query.to || now;
    let from;

    if (period === EARNINGS_PERIODS.CUSTOM) {
        from = query.from;
    } else if (period === EARNINGS_PERIODS.TODAY) {
        from = startOfDay(now);
    } else if (period === EARNINGS_PERIODS.THIS_MONTH) {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
        from = startOfWeek(now);
    }

    return {
        period,
        from,
        to: endOfWindow
    };
};

const buildRideTimeline = (ride = {}) => {
    const confirmedAt = ride.confirmedAt || (ride.status === RIDE_BOOKING_STATUSES.CONFIRMED ? ride.createdAt : null);
    const driverEtaMinutes = ride.selectedDriver?.etaMinutes || 0;
    const rideDurationMinutes = ride.fareSnapshot?.durationMinutes || 0;
    const driverArrivalEtaAt = confirmedAt ? addMinutes(new Date(confirmedAt), driverEtaMinutes) : null;
    const estimatedDropoffAt = driverArrivalEtaAt ? addMinutes(driverArrivalEtaAt, rideDurationMinutes) : null;

    return {
        confirmedAt,
        driverArrivalEtaAt,
        estimatedDropoffAt
    };
};

const resolveLifecycleStatus = (ride = {}, timeline = {}, now = new Date()) => {
    if (ride.status === RIDE_BOOKING_STATUSES.CANCELLED) {
        return 'cancelled';
    }

    if (ride.status !== RIDE_BOOKING_STATUSES.CONFIRMED || !timeline.confirmedAt) {
        return 'pending';
    }

    if (timeline.estimatedDropoffAt && now >= new Date(timeline.estimatedDropoffAt)) {
        return 'completed';
    }

    return 'pending';
};

const resolveEarningStatus = ({ lifecycleStatus, payment = {} }) => {
    if (lifecycleStatus === 'cancelled') {
        return EARNINGS_STATUSES.CANCELLED;
    }

    if (lifecycleStatus !== 'completed') {
        return EARNINGS_STATUSES.PENDING;
    }

    if (payment?.status === PAYMENT_STATUSES.REFUNDED) {
        return EARNINGS_STATUSES.REFUNDED;
    }

    if (payment?.status === PAYMENT_STATUSES.REFUND_REQUESTED || payment?.status === PAYMENT_STATUSES.FAILED) {
        return EARNINGS_STATUSES.ON_HOLD;
    }

    if (payment?.status === PAYMENT_STATUSES.SUCCEEDED) {
        return payment.method === PAYMENT_METHODS.CASH
            ? EARNINGS_STATUSES.SETTLED
            : EARNINGS_STATUSES.AVAILABLE;
    }

    return EARNINGS_STATUSES.PENDING;
};

const groupEarningStatements = (items = [], groupBy = EARNINGS_STATEMENT_PERIODS.WEEKLY) => {
    const grouped = new Map();

    items.forEach((item) => {
        const basisDate = new Date(item.timeline?.completedAt || item.timeline?.bookedAt || Date.now());
        const period = resolveStatementWindow(basisDate, groupBy);

        if (!grouped.has(period.statementId)) {
            grouped.set(period.statementId, {
                ...period,
                period: groupBy,
                items: []
            });
        }

        grouped.get(period.statementId).items.push(item);
    });

    return [...grouped.values()]
        .sort((left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime());
};

const resolveStatementWindow = (date, groupBy) => {
    if (groupBy === EARNINGS_STATEMENT_PERIODS.DAILY) {
        const startsAt = startOfDay(date);
        const endsAt = endOfDay(date);

        return {
            statementId: `earnings-daily-${formatDateKey(startsAt)}`,
            startsAt,
            endsAt
        };
    }

    if (groupBy === EARNINGS_STATEMENT_PERIODS.MONTHLY) {
        const startsAt = new Date(date.getFullYear(), date.getMonth(), 1);
        const endsAt = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

        return {
            statementId: `earnings-monthly-${startsAt.getFullYear()}-${String(startsAt.getMonth() + 1).padStart(2, '0')}`,
            startsAt,
            endsAt
        };
    }

    const startsAt = startOfWeek(date);
    const endsAt = new Date(startsAt);
    endsAt.setDate(startsAt.getDate() + 6);
    endsAt.setHours(23, 59, 59, 999);

    return {
        statementId: `earnings-weekly-${formatDateKey(startsAt)}`,
        startsAt,
        endsAt
    };
};

const normalizeDriver = (authUser = {}, driverProfile = {}) => ({
    driverId: driverProfile.driverCode || authUser.employeeCode || getId(driverProfile),
    driverCode: driverProfile.driverCode || null,
    fullName: authUser.fullName || driverProfile.profile?.displayName || null,
    displayName: driverProfile.profile?.displayName || authUser.fullName || null,
    serviceZone: driverProfile.service?.serviceZone || authUser.serviceZone || null
});

const filterByStatus = (items = [], status) => status
    ? items.filter((item) => item.status === status)
    : items;

const resolveSurgeIncentive = (grossFare, surgeMultiplier) => {
    if (surgeMultiplier <= 1) {
        return 0;
    }

    return roundMoney(grossFare * (surgeMultiplier - 1) * EARNINGS_DEFAULT_SURGE_INCENTIVE_RATE);
};

const resolveDeductionAmount = (payment = {}) => {
    if (!payment?.refund?.amount) {
        return 0;
    }

    return roundMoney(payment.refund.amount * EARNINGS_DEFAULT_DRIVER_SHARE_RATE);
};

const resolveEarningGuidance = (status) => {
    if (status === EARNINGS_STATUSES.ON_HOLD) {
        return 'Payment or refund review is holding this earning';
    }

    if (status === EARNINGS_STATUSES.PENDING) {
        return 'Earning will update after ride completion and payment capture';
    }

    if (status === EARNINGS_STATUSES.SETTLED) {
        return 'Cash earning is already settled with the driver';
    }

    if (status === EARNINGS_STATUSES.CANCELLED) {
        return 'Cancelled ride has no driver earning';
    }

    if (status === EARNINGS_STATUSES.REFUNDED) {
        return 'Refunded ride has no payable earning';
    }

    return 'Earning is available for payout';
};

const buildSimulationGuidance = (components = {}) => ({
    nextAction: components.netEarning > 0
        ? 'Use this estimate for driver payout preview'
        : 'No payable driver earning for this input',
    driverShareRate: components.driverShareRate,
    platformFeeRate: components.platformFeeRate
});

const startOfDay = (date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    return start;
};

const endOfDay = (date) => {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return end;
};

const startOfWeek = (date) => {
    const start = startOfDay(date);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    start.setDate(start.getDate() + diff);

    return start;
};

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

const formatDateKey = (date) => date.toISOString().slice(0, 10);

const roundMoney = (value) => Number(value.toFixed(2));

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const toPlainArray = (documents = []) => documents.map((document) => toPlainObject(document));

const getId = (document = {}) => document?._id?.toString?.() || document?.id || null;

const toId = (value) => value?._id?.toString?.() || value?.toString?.() || value || null;
