import {
    EARNINGS_COMPONENT_TYPES,
    EARNINGS_CURRENCY,
    EARNINGS_DEFAULT_DRIVER_SHARE_RATE,
    EARNINGS_DEFAULT_PLATFORM_FEE_RATE,
    EARNINGS_DEFAULT_SURGE_INCENTIVE_RATE,
    EARNINGS_PERIODS,
    EARNINGS_STATEMENT_PERIODS,
    EARNINGS_STATUSES
} from '../earnings.constants.js';

export const toEarningsOptions = () => ({
    currency: EARNINGS_CURRENCY,
    periods: Object.values(EARNINGS_PERIODS),
    statementPeriods: Object.values(EARNINGS_STATEMENT_PERIODS),
    statuses: Object.values(EARNINGS_STATUSES),
    componentTypes: Object.values(EARNINGS_COMPONENT_TYPES),
    defaults: {
        driverShareRate: EARNINGS_DEFAULT_DRIVER_SHARE_RATE,
        platformFeeRate: EARNINGS_DEFAULT_PLATFORM_FEE_RATE,
        surgeIncentiveRate: EARNINGS_DEFAULT_SURGE_INCENTIVE_RATE
    }
});

export const toEarningsSummary = ({ driver, window, items = [] }) => ({
    driver: toDriverIdentity(driver),
    window,
    summary: buildSummary(items),
    recentRides: items.slice(0, 6).map(toEarningRideListItem),
    guidance: buildGuidance(items)
});

export const toEarningRideList = ({ driver, window, items = [] }) => ({
    driver: toDriverIdentity(driver),
    window,
    rides: items.map(toEarningRideListItem),
    summary: buildSummary(items)
});

export const toEarningRide = (item = {}) => ({
    ...toEarningRideListItem(item),
    route: {
        pickup: item.pickup || null,
        dropoff: item.dropoff || null
    },
    fare: item.fare,
    payment: item.payment,
    components: item.components,
    timeline: item.timeline,
    trustSummary: item.trustSummary
});

export const toEarningStatements = ({ driver, window, statements = [] }) => ({
    driver: toDriverIdentity(driver),
    window,
    statements: statements.map((statement) => ({
        statementId: statement.statementId,
        period: statement.period,
        startsAt: statement.startsAt,
        endsAt: statement.endsAt,
        rideCount: statement.items.length,
        summary: buildSummary(statement.items),
        status: resolveStatementStatus(statement.items)
    })),
    summary: buildSummary(statements.flatMap((statement) => statement.items))
});

export const toEarningSimulation = ({ fare, components, status, guidance }) => ({
    currency: fare.currency || EARNINGS_CURRENCY,
    status,
    fare,
    components,
    netEarning: components.netEarning,
    guidance
});

const toEarningRideListItem = (item = {}) => ({
    rideId: item.rideId,
    bookingCode: item.bookingCode || null,
    status: item.status || EARNINGS_STATUSES.PENDING,
    vehicleType: item.vehicleType || null,
    completedAt: item.timeline?.completedAt || null,
    settledAt: item.payment?.capturedAt || null,
    grossFare: numberOrZero(item.components?.grossFare),
    platformFee: numberOrZero(item.components?.platformFee),
    driverFare: numberOrZero(item.components?.driverFare),
    incentiveAmount: numberOrZero(item.components?.incentiveAmount),
    tipAmount: numberOrZero(item.components?.tipAmount),
    deductionAmount: numberOrZero(item.components?.deductionAmount),
    netEarning: numberOrZero(item.components?.netEarning),
    paymentStatus: item.payment?.status || null,
    paymentMethod: item.payment?.method || item.paymentMethod || null,
    guidance: item.guidance || null
});

const buildSummary = (items = []) => ({
    rideCount: items.length,
    completedRides: items.filter((item) => ![
        EARNINGS_STATUSES.CANCELLED,
        EARNINGS_STATUSES.PENDING
    ].includes(item.status)).length,
    pendingRides: countByStatus(items, EARNINGS_STATUSES.PENDING),
    cancelledRides: countByStatus(items, EARNINGS_STATUSES.CANCELLED),
    availableRides: countByStatus(items, EARNINGS_STATUSES.AVAILABLE),
    settledRides: countByStatus(items, EARNINGS_STATUSES.SETTLED),
    onHoldRides: countByStatus(items, EARNINGS_STATUSES.ON_HOLD),
    refundedRides: countByStatus(items, EARNINGS_STATUSES.REFUNDED),
    grossFare: sumBy(items, 'grossFare'),
    platformFee: sumBy(items, 'platformFee'),
    driverFare: sumBy(items, 'driverFare'),
    incentiveAmount: sumBy(items, 'incentiveAmount'),
    tipAmount: sumBy(items, 'tipAmount'),
    deductionAmount: sumBy(items, 'deductionAmount'),
    netEarnings: sumBy(items, 'netEarning'),
    availableForPayout: sumNetByStatuses(items, [
        EARNINGS_STATUSES.AVAILABLE,
        EARNINGS_STATUSES.SETTLED
    ]),
    pendingEarnings: sumNetByStatuses(items, [EARNINGS_STATUSES.PENDING]),
    averageNetPerRide: averageNet(items)
});

const buildGuidance = (items = []) => ({
    nextAction: items.some((item) => item.status === EARNINGS_STATUSES.ON_HOLD)
        ? 'Review held earnings with support'
        : items.some((item) => item.status === EARNINGS_STATUSES.PENDING)
            ? 'Pending ride earnings will update after payment capture'
            : 'No action needed',
    hasHeldEarnings: items.some((item) => item.status === EARNINGS_STATUSES.ON_HOLD),
    hasPendingEarnings: items.some((item) => item.status === EARNINGS_STATUSES.PENDING)
});

const resolveStatementStatus = (items = []) => {
    if (!items.length) {
        return EARNINGS_STATUSES.PENDING;
    }

    if (items.some((item) => item.status === EARNINGS_STATUSES.ON_HOLD)) {
        return EARNINGS_STATUSES.ON_HOLD;
    }

    if (items.every((item) => item.status === EARNINGS_STATUSES.SETTLED)) {
        return EARNINGS_STATUSES.SETTLED;
    }

    if (items.some((item) => item.status === EARNINGS_STATUSES.AVAILABLE)) {
        return EARNINGS_STATUSES.AVAILABLE;
    }

    return EARNINGS_STATUSES.PENDING;
};

const toDriverIdentity = (driver = {}) => ({
    driverId: driver.driverId || null,
    driverCode: driver.driverCode || null,
    fullName: driver.fullName || driver.displayName || null,
    serviceZone: driver.serviceZone || null
});

const countByStatus = (items = [], status) => items.filter((item) => item.status === status).length;

const sumBy = (items = [], key) => roundMoney(items.reduce((sum, item) => sum + numberOrZero(item.components?.[key]), 0));

const sumNetByStatuses = (items = [], statuses = []) => roundMoney(
    items
        .filter((item) => statuses.includes(item.status))
        .reduce((sum, item) => sum + numberOrZero(item.components?.netEarning), 0)
);

const averageNet = (items = []) => {
    const payableItems = items.filter((item) => ![
        EARNINGS_STATUSES.CANCELLED,
        EARNINGS_STATUSES.REFUNDED
    ].includes(item.status));

    if (!payableItems.length) {
        return 0;
    }

    return roundMoney(payableItems.reduce((sum, item) => sum + numberOrZero(item.components?.netEarning), 0) / payableItems.length);
};

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;

const roundMoney = (value) => Number(value.toFixed(2));
