import {
    ANALYTICS_DEFAULT_PLATFORM_FEE_RATE,
    ANALYTICS_GROUP_BY,
    ANALYTICS_METRICS,
    ANALYTICS_PERIODS
} from '../analytics.constants.js';

export const toAnalyticsOptions = () => ({
    periods: Object.values(ANALYTICS_PERIODS),
    groupBy: Object.values(ANALYTICS_GROUP_BY),
    metrics: Object.values(ANALYTICS_METRICS),
    defaults: {
        platformFeeRate: ANALYTICS_DEFAULT_PLATFORM_FEE_RATE
    }
});

export const toAnalyticsOverview = ({ window, rides, payments, disputes, ratings, drivers, trustProfiles, fraudCases }) => ({
    window,
    summary: {
        rides: toRideSummary(rides),
        revenue: toRevenueSummary(payments),
        disputes: toDisputeSummary(disputes),
        ratings: toRatingSummary(ratings),
        drivers: toDriverSummary(drivers),
        trustSafety: toTrustSafetySummary({ trustProfiles, fraudCases })
    },
    highlights: buildHighlights({ rides, payments, disputes, ratings, drivers, trustProfiles, fraudCases })
});

export const toRideAnalytics = ({ window, groupBy, rides }) => ({
    window,
    groupBy,
    summary: toRideSummary(rides),
    series: groupByDate(rides, groupBy, (items) => toRideSummary(items)),
    byVehicleType: groupByField(rides, 'vehicleType', toRideSummary),
    byStatus: groupByField(rides, 'status', toRideSummary)
});

export const toRevenueAnalytics = ({ window, groupBy, payments }) => ({
    window,
    groupBy,
    summary: toRevenueSummary(payments),
    series: groupByDate(payments, groupBy, toRevenueSummary),
    byMethod: groupByField(payments, 'method', toRevenueSummary),
    byStatus: groupByField(payments, 'status', toRevenueSummary)
});

export const toDriverAnalytics = ({ window, drivers, rides }) => ({
    window,
    summary: toDriverSummary(drivers),
    topDrivers: buildTopDrivers(rides),
    supplyByApprovalStatus: groupByField(drivers, 'approvalStatus', toDriverSummary),
    supplyByZone: groupByNestedField(drivers, 'service.serviceZone', toDriverSummary)
});

export const toTrustSafetyAnalytics = ({ window, disputes, ratings, trustProfiles, fraudCases }) => ({
    window,
    summary: {
        disputes: toDisputeSummary(disputes),
        ratings: toRatingSummary(ratings),
        trust: toTrustSummary(trustProfiles),
        fraud: toFraudSummary(fraudCases)
    },
    highRiskTrustProfiles: trustProfiles
        .filter((profile) => ['high', 'critical'].includes(profile.riskLevel))
        .map(toTrustProfileItem),
    openFraudCases: fraudCases
        .filter((fraudCase) => ['open', 'under_review', 'confirmed'].includes(fraudCase.status))
        .map(toFraudCaseItem),
    urgentDisputes: disputes
        .filter((dispute) => dispute.priority === 'urgent')
        .map(toDisputeItem)
});

export const toAnalyticsForecast = ({ input, forecast }) => ({
    input,
    forecast,
    summary: {
        projectedRides: forecast.reduce((sum, item) => sum + item.rides, 0),
        projectedGrossRevenue: roundMoney(forecast.reduce((sum, item) => sum + item.grossRevenue, 0)),
        projectedPlatformRevenue: roundMoney(forecast.reduce((sum, item) => sum + item.platformRevenue, 0)),
        projectedDriverPayout: roundMoney(forecast.reduce((sum, item) => sum + item.driverPayout, 0))
    }
});

const toRideSummary = (rides = []) => ({
    totalRides: rides.length,
    confirmedRides: countBy(rides, 'status', 'confirmed'),
    cancelledRides: countBy(rides, 'status', 'cancelled'),
    driverSelectedRides: countBy(rides, 'status', 'driver_selected'),
    averageFare: average(rides.map((ride) => numberOrZero(ride.fareSnapshot?.totalFare))),
    totalFare: roundMoney(rides.reduce((sum, ride) => sum + numberOrZero(ride.fareSnapshot?.totalFare), 0)),
    averageDistanceKm: average(rides.map((ride) => numberOrZero(ride.fareSnapshot?.distanceKm))),
    averageDurationMinutes: average(rides.map((ride) => numberOrZero(ride.fareSnapshot?.durationMinutes)))
});

const toRevenueSummary = (payments = []) => ({
    totalPayments: payments.length,
    succeededPayments: countBy(payments, 'status', 'succeeded'),
    failedPayments: countBy(payments, 'status', 'failed'),
    refundRequestedPayments: countBy(payments, 'status', 'refund_requested'),
    refundedPayments: countBy(payments, 'status', 'refunded'),
    grossRevenue: sum(payments, 'amount'),
    fareRevenue: sum(payments, 'fareAmount'),
    tipAmount: sum(payments, 'tipAmount'),
    discountAmount: sum(payments, 'discountAmount'),
    refundAmount: roundMoney(payments.reduce((total, payment) => total + numberOrZero(payment.refund?.amount), 0)),
    netRevenue: roundMoney(payments.reduce(
        (total, payment) => total + numberOrZero(payment.amount) - numberOrZero(payment.refund?.amount),
        0
    ))
});

const toDisputeSummary = (disputes = []) => ({
    totalDisputes: disputes.length,
    openDisputes: disputes.filter((dispute) => ['submitted', 'under_review', 'evidence_requested'].includes(dispute.status)).length,
    resolvedDisputes: countBy(disputes, 'status', 'resolved'),
    rejectedDisputes: countBy(disputes, 'status', 'rejected'),
    urgentDisputes: countBy(disputes, 'priority', 'urgent'),
    requestedRefundAmount: roundMoney(disputes.reduce((total, dispute) => total + numberOrZero(dispute.requestedRefundAmount), 0))
});

const toRatingSummary = (ratings = []) => ({
    totalRatings: ratings.length,
    averageScore: average(ratings.map((rating) => numberOrZero(rating.score))),
    positiveRatings: ratings.filter((rating) => ['positive', 'delighted'].includes(rating.sentiment)).length,
    negativeRatings: ratings.filter((rating) => ['negative', 'angry'].includes(rating.sentiment)).length
});

const toDriverSummary = (drivers = []) => ({
    totalDrivers: drivers.length,
    approvedDrivers: countBy(drivers, 'approvalStatus', 'approved'),
    pendingDrivers: countBy(drivers, 'approvalStatus', 'pending'),
    underReviewDrivers: countBy(drivers, 'approvalStatus', 'under_review'),
    onlineDrivers: drivers.filter((driver) => driver.availability?.status === 'online').length,
    offlineDrivers: drivers.filter((driver) => driver.availability?.status === 'offline').length
});

const toTrustSafetySummary = ({ trustProfiles = [], fraudCases = [] }) => ({
    trustProfiles: trustProfiles.length,
    highRiskTrustProfiles: trustProfiles.filter((profile) => ['high', 'critical'].includes(profile.riskLevel)).length,
    openTrustReviews: trustProfiles.filter((profile) => ['open', 'under_review'].includes(profile.reviewStatus)).length,
    fraudCases: fraudCases.length,
    openFraudCases: fraudCases.filter((fraudCase) => ['open', 'under_review', 'confirmed'].includes(fraudCase.status)).length,
    criticalFraudCases: fraudCases.filter((fraudCase) => fraudCase.severity === 'critical').length
});

const toTrustSummary = (trustProfiles = []) => ({
    totalProfiles: trustProfiles.length,
    highRiskProfiles: trustProfiles.filter((profile) => ['high', 'critical'].includes(profile.riskLevel)).length,
    openReviews: trustProfiles.filter((profile) => ['open', 'under_review'].includes(profile.reviewStatus)).length,
    averageScore: average(trustProfiles.map((profile) => numberOrZero(profile.scores?.overall)))
});

const toFraudSummary = (fraudCases = []) => ({
    totalCases: fraudCases.length,
    openCases: fraudCases.filter((fraudCase) => ['open', 'under_review', 'confirmed'].includes(fraudCase.status)).length,
    criticalCases: fraudCases.filter((fraudCase) => fraudCase.severity === 'critical').length,
    averageRiskScore: average(fraudCases.map((fraudCase) => numberOrZero(fraudCase.riskScore)))
});

const buildHighlights = ({ rides, payments, disputes, ratings, drivers, trustProfiles, fraudCases }) => ({
    rideVolume: rides.length,
    netRevenue: toRevenueSummary(payments).netRevenue,
    averageRating: toRatingSummary(ratings).averageScore,
    openDisputes: toDisputeSummary(disputes).openDisputes,
    onlineDrivers: toDriverSummary(drivers).onlineDrivers,
    highRiskTrustProfiles: toTrustSafetySummary({ trustProfiles, fraudCases }).highRiskTrustProfiles,
    openFraudCases: toTrustSafetySummary({ trustProfiles, fraudCases }).openFraudCases
});

const buildTopDrivers = (rides = []) => Object.values(rides.reduce((result, ride) => {
    const driverId = ride.selectedDriver?.driverId || 'unassigned';

    result[driverId] = result[driverId] || {
        driverId,
        fullName: ride.selectedDriver?.fullName || null,
        rideCount: 0,
        totalFare: 0
    };
    result[driverId].rideCount += 1;
    result[driverId].totalFare += numberOrZero(ride.fareSnapshot?.totalFare);

    return result;
}, {}))
    .map((driver) => ({
        ...driver,
        totalFare: roundMoney(driver.totalFare),
        averageFare: roundMoney(driver.totalFare / driver.rideCount)
    }))
    .sort((left, right) => right.rideCount - left.rideCount)
    .slice(0, 10);

const toTrustProfileItem = (profile = {}) => ({
    id: getId(profile),
    subjectType: profile.subjectType || null,
    subjectId: profile.subjectId || null,
    riskLevel: profile.riskLevel || null,
    reviewStatus: profile.reviewStatus || null,
    overallScore: numberOrZero(profile.scores?.overall)
});

const toFraudCaseItem = (fraudCase = {}) => ({
    id: getId(fraudCase),
    caseCode: fraudCase.caseCode || null,
    caseType: fraudCase.caseType || null,
    severity: fraudCase.severity || null,
    status: fraudCase.status || null,
    riskScore: numberOrZero(fraudCase.riskScore)
});

const toDisputeItem = (dispute = {}) => ({
    id: getId(dispute),
    disputeCode: dispute.disputeCode || null,
    type: dispute.type || null,
    status: dispute.status || null,
    priority: dispute.priority || null,
    requestedRefundAmount: nullableNumber(dispute.requestedRefundAmount)
});

const groupByDate = (items = [], groupBy, summaryBuilder) => {
    const grouped = groupItems(items, (item) => dateBucket(item.createdAt || item.submittedAt, groupBy));

    return Object.entries(grouped)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([bucket, bucketItems]) => ({
            bucket,
            ...summaryBuilder(bucketItems)
        }));
};

const groupByField = (items = [], field, summaryBuilder) => Object.entries(groupItems(items, (item) => item[field] || 'unknown'))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, bucketItems]) => ({
        key,
        ...summaryBuilder(bucketItems)
    }));

const groupByNestedField = (items = [], path, summaryBuilder) => Object.entries(groupItems(items, (item) => getPath(item, path) || 'unknown'))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, bucketItems]) => ({
        key,
        ...summaryBuilder(bucketItems)
    }));

const groupItems = (items = [], keyResolver) => items.reduce((result, item) => {
    const key = keyResolver(item);

    result[key] = result[key] || [];
    result[key].push(item);

    return result;
}, {});

const dateBucket = (value, groupBy) => {
    const date = value ? new Date(value) : new Date(0);

    if (groupBy === ANALYTICS_GROUP_BY.MONTH) {
        return date.toISOString().slice(0, 7);
    }

    if (groupBy === ANALYTICS_GROUP_BY.WEEK) {
        const weekStart = new Date(date);
        const day = weekStart.getUTCDay();
        const diff = day === 0 ? -6 : 1 - day;
        weekStart.setUTCDate(weekStart.getUTCDate() + diff);

        return weekStart.toISOString().slice(0, 10);
    }

    return date.toISOString().slice(0, 10);
};

const getPath = (item = {}, path = '') => path.split('.').reduce((value, key) => value?.[key], item);

const countBy = (items = [], field, value) => items.filter((item) => item[field] === value).length;

const sum = (items = [], field) => roundMoney(items.reduce((total, item) => total + numberOrZero(item[field]), 0));

const average = (values = []) => {
    const numbers = values.filter(Number.isFinite);

    if (!numbers.length) {
        return 0;
    }

    return roundMoney(numbers.reduce((sum, value) => sum + value, 0) / numbers.length);
};

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;

const nullableNumber = (value) => Number.isFinite(value) ? value : null;

const roundMoney = (value) => Number(value.toFixed(2));

const getId = (document = {}) => document._id?.toString?.() || document.id || null;
