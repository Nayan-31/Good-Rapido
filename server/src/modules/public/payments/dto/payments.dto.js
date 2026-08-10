export const toPublicPaymentMethod = (method, wallet = {}) => ({
    code: method.code,
    label: method.label,
    type: method.type,
    isDefault: Boolean(method.isDefault),
    supportsRefund: Boolean(method.supportsRefund),
    settlementSpeed: method.settlementSpeed,
    description: method.description,
    balance: method.code === 'personal_wallet' ? numberOrZero(wallet.availableBalance) : null
});

export const toPublicWallet = (wallet = {}) => ({
    currency: wallet.currency || 'INR',
    openingBalance: numberOrZero(wallet.openingBalance),
    availableBalance: numberOrZero(wallet.availableBalance),
    reservedBalance: numberOrZero(wallet.reservedBalance),
    lowBalance: Boolean(wallet.lowBalance),
    message: wallet.message || null
});

export const toPublicPayment = (payment) => ({
    id: getId(payment),
    paymentCode: payment.paymentCode,
    rideId: getRideId(payment),
    ride: toPublicRideSnapshot(payment.rideSnapshot),
    method: payment.method,
    status: payment.status,
    currency: payment.currency || 'INR',
    fareAmount: numberOrZero(payment.fareAmount),
    tipAmount: numberOrZero(payment.tipAmount),
    discountAmount: numberOrZero(payment.discountAmount),
    amount: numberOrZero(payment.amount),
    wallet: {
        before: nullableNumber(payment.walletBalanceBefore),
        after: nullableNumber(payment.walletBalanceAfter)
    },
    gatewayReference: payment.gatewayReference || null,
    gateway: toPublicGateway(payment.gateway),
    failureReason: payment.failureReason || null,
    capturedAt: payment.capturedAt || null,
    refundableUntil: payment.refundableUntil || null,
    refund: payment.refund ? toPublicRefund(payment) : null,
    createdAt: payment.createdAt || null,
    updatedAt: payment.updatedAt || null
});

export const toPublicPaymentHistoryItem = (payment) => ({
    id: getId(payment),
    paymentCode: payment.paymentCode,
    rideId: getRideId(payment),
    bookingCode: payment.rideSnapshot?.bookingCode || null,
    method: payment.method,
    status: payment.status,
    currency: payment.currency || 'INR',
    amount: numberOrZero(payment.amount),
    driverName: payment.rideSnapshot?.driver?.fullName || null,
    capturedAt: payment.capturedAt || null,
    createdAt: payment.createdAt || null
});

export const toPublicRefund = (payment) => ({
    paymentId: getId(payment),
    paymentCode: payment.paymentCode,
    status: payment.status,
    reason: payment.refund?.reason || null,
    note: payment.refund?.note || null,
    amount: numberOrZero(payment.refund?.amount),
    requestedAt: payment.refund?.requestedAt || null,
    resolvedAt: payment.refund?.resolvedAt || null,
    gateway: {
        provider: payment.refund?.gatewayProvider || null,
        refundId: payment.refund?.gatewayRefundId || null,
        status: payment.refund?.gatewayStatus || null,
        failureReason: payment.refund?.gatewayFailureReason || null
    }
});

const toPublicGateway = (gateway = {}) => ({
    provider: gateway?.provider || null,
    status: gateway?.status || null,
    orderId: gateway?.orderId || null,
    paymentId: gateway?.paymentId || null,
    paymentIntentId: gateway?.paymentIntentId || null,
    checkoutId: gateway?.checkoutId || null,
    clientSecret: gateway?.clientSecret || null,
    publicKey: gateway?.publicKey || null,
    paymentUrl: gateway?.paymentUrl || null,
    failureReason: gateway?.failureReason || null,
    rawStatus: gateway?.rawStatus || null,
    lastEventAt: gateway?.lastEventAt || null
});

const toPublicRideSnapshot = (ride = {}) => ({
    bookingCode: ride?.bookingCode || null,
    pickup: toPublicLocation(ride?.pickup),
    dropoff: toPublicLocation(ride?.dropoff),
    vehicleType: ride?.vehicleType || null,
    driver: {
        driverId: ride?.driver?.driverId || null,
        fullName: ride?.driver?.fullName || null,
        vehicleName: ride?.driver?.vehicleName || null,
        vehicleNumber: ride?.driver?.vehicleNumber || null
    }
});

const toPublicLocation = (location = {}) => ({
    address: location?.address || null,
    latitude: numberOrZero(location?.latitude),
    longitude: numberOrZero(location?.longitude)
});

const getId = (document = {}) => document._id?.toString() || document.id || null;

const getRideId = (payment = {}) => payment.rideId?._id?.toString?.()
    || payment.rideId?.toString?.()
    || payment.rideId
    || null;

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;

const nullableNumber = (value) => Number.isFinite(value) ? value : null;
