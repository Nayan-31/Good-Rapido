import crypto from 'node:crypto';
import env from '../../../config/env.js';
import AppError from '../../../shared/utils/appError.js';
import {
    PAYMENT_CURRENCY,
    PAYMENT_GATEWAY_PROVIDERS,
    PAYMENT_GATEWAY_STATUSES
} from './payments.constants.js';

const RAZORPAY_ORDERS_URL = 'https://api.razorpay.com/v1/orders';
const RAZORPAY_PAYMENTS_URL = 'https://api.razorpay.com/v1/payments';
const STRIPE_PAYMENT_INTENTS_URL = 'https://api.stripe.com/v1/payment_intents';
const STRIPE_REFUNDS_URL = 'https://api.stripe.com/v1/refunds';

export default class PaymentGatewayService {
    constructor({
        provider = env.PAYMENT_GATEWAY_PROVIDER,
        razorpayKeyId = env.RAZORPAY_KEY_ID,
        razorpayKeySecret = env.RAZORPAY_KEY_SECRET,
        stripeSecretKey = env.STRIPE_SECRET_KEY,
        stripePublishableKey = env.STRIPE_PUBLISHABLE_KEY,
        fetchImpl = globalThis.fetch,
        now = () => new Date()
    } = {}) {
        this.provider = provider || PAYMENT_GATEWAY_PROVIDERS.MOCK;
        this.razorpayKeyId = razorpayKeyId;
        this.razorpayKeySecret = razorpayKeySecret;
        this.stripeSecretKey = stripeSecretKey;
        this.stripePublishableKey = stripePublishableKey;
        this.fetchImpl = fetchImpl;
        this.now = now;
    }

    async createPaymentSession({ paymentCode, amount, currency = PAYMENT_CURRENCY, paymentMethod, rideSnapshot }) {
        if (this.provider === PAYMENT_GATEWAY_PROVIDERS.RAZORPAY && this.hasRazorpayCredentials()) {
            return this.createRazorpayOrder({ paymentCode, amount, currency, paymentMethod, rideSnapshot });
        }

        if (this.provider === PAYMENT_GATEWAY_PROVIDERS.STRIPE && this.hasStripeCredentials()) {
            return this.createStripePaymentIntent({ paymentCode, amount, currency, paymentMethod, rideSnapshot });
        }

        return this.createMockSession({ paymentCode, amount, currency, paymentMethod });
    }

    async confirmPaymentSuccess(payment, payload = {}) {
        const provider = payment.gateway?.provider || this.provider;

        if (provider === PAYMENT_GATEWAY_PROVIDERS.RAZORPAY) {
            this.verifyRazorpaySignature(payment, payload);
        }

        return {
            provider,
            status: PAYMENT_GATEWAY_STATUSES.SUCCEEDED,
            paymentId: payload.providerPaymentId || payload.razorpayPaymentId || payment.gateway?.paymentId || null,
            orderId: payload.providerOrderId || payload.razorpayOrderId || payment.gateway?.orderId || null,
            paymentIntentId: payload.providerPaymentIntentId || payment.gateway?.paymentIntentId || null,
            rawStatus: payload.rawProviderStatus || PAYMENT_GATEWAY_STATUSES.SUCCEEDED,
            gatewayReference: payload.providerPaymentId
                || payload.razorpayPaymentId
                || payload.providerPaymentIntentId
                || payment.gatewayReference,
            lastEventAt: this.now()
        };
    }

    async markPaymentFailed(payment, payload = {}) {
        return {
            provider: payment.gateway?.provider || this.provider,
            status: PAYMENT_GATEWAY_STATUSES.FAILED,
            paymentId: payload.providerPaymentId || payment.gateway?.paymentId || null,
            orderId: payload.providerOrderId || payment.gateway?.orderId || null,
            paymentIntentId: payload.providerPaymentIntentId || payment.gateway?.paymentIntentId || null,
            rawStatus: payload.rawProviderStatus || PAYMENT_GATEWAY_STATUSES.FAILED,
            failureReason: payload.failureReason || 'Payment failed at gateway',
            lastEventAt: this.now()
        };
    }

    async createRefund(payment, { amount, reason }) {
        const provider = payment.gateway?.provider || this.provider;

        if (provider === PAYMENT_GATEWAY_PROVIDERS.RAZORPAY && this.hasRazorpayCredentials() && payment.gateway?.paymentId) {
            return this.createRazorpayRefund(payment, { amount, reason });
        }

        if (provider === PAYMENT_GATEWAY_PROVIDERS.STRIPE && this.hasStripeCredentials() && payment.gateway?.paymentIntentId) {
            return this.createStripeRefund(payment, { amount, reason });
        }

        return {
            provider,
            refundId: `mock_refund_${Date.now()}`,
            status: PAYMENT_GATEWAY_STATUSES.REFUNDED,
            rawStatus: PAYMENT_GATEWAY_STATUSES.REFUNDED
        };
    }

    hasRazorpayCredentials() {
        return Boolean(this.razorpayKeyId && this.razorpayKeySecret);
    }

    hasStripeCredentials() {
        return Boolean(this.stripeSecretKey);
    }

    async createRazorpayOrder({ paymentCode, amount, currency, paymentMethod, rideSnapshot }) {
        const response = await this.providerFetch(RAZORPAY_ORDERS_URL, {
            method: 'POST',
            headers: {
                Authorization: toBasicAuth(this.razorpayKeyId, this.razorpayKeySecret),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: toSmallestCurrencyUnit(amount),
                currency,
                receipt: paymentCode,
                notes: {
                    paymentCode,
                    paymentMethod,
                    bookingCode: rideSnapshot?.bookingCode || ''
                }
            })
        });

        return {
            provider: PAYMENT_GATEWAY_PROVIDERS.RAZORPAY,
            status: PAYMENT_GATEWAY_STATUSES.SESSION_CREATED,
            orderId: response.id,
            publicKey: this.razorpayKeyId,
            gatewayReference: response.id,
            rawStatus: response.status || PAYMENT_GATEWAY_STATUSES.SESSION_CREATED,
            lastEventAt: this.now()
        };
    }

    async createStripePaymentIntent({ paymentCode, amount, currency, paymentMethod, rideSnapshot }) {
        const body = new URLSearchParams({
            amount: String(toSmallestCurrencyUnit(amount)),
            currency: currency.toLowerCase(),
            'metadata[paymentCode]': paymentCode,
            'metadata[paymentMethod]': paymentMethod,
            'metadata[bookingCode]': rideSnapshot?.bookingCode || '',
            'automatic_payment_methods[enabled]': 'true'
        });

        const response = await this.providerFetch(STRIPE_PAYMENT_INTENTS_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.stripeSecretKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body
        });

        return {
            provider: PAYMENT_GATEWAY_PROVIDERS.STRIPE,
            status: PAYMENT_GATEWAY_STATUSES.REQUIRES_ACTION,
            paymentIntentId: response.id,
            clientSecret: response.client_secret,
            publicKey: this.stripePublishableKey || null,
            gatewayReference: response.id,
            rawStatus: response.status || PAYMENT_GATEWAY_STATUSES.REQUIRES_ACTION,
            lastEventAt: this.now()
        };
    }

    async createRazorpayRefund(payment, { amount, reason }) {
        const response = await this.providerFetch(`${RAZORPAY_PAYMENTS_URL}/${payment.gateway.paymentId}/refund`, {
            method: 'POST',
            headers: {
                Authorization: toBasicAuth(this.razorpayKeyId, this.razorpayKeySecret),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: toSmallestCurrencyUnit(amount),
                notes: {
                    paymentCode: payment.paymentCode,
                    reason
                }
            })
        });

        return {
            provider: PAYMENT_GATEWAY_PROVIDERS.RAZORPAY,
            refundId: response.id,
            status: mapProviderRefundStatus(response.status),
            rawStatus: response.status || null
        };
    }

    async createStripeRefund(payment, { amount, reason }) {
        const body = new URLSearchParams({
            payment_intent: payment.gateway.paymentIntentId,
            amount: String(toSmallestCurrencyUnit(amount)),
            reason: mapStripeRefundReason(reason),
            'metadata[paymentCode]': payment.paymentCode
        });

        const response = await this.providerFetch(STRIPE_REFUNDS_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.stripeSecretKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body
        });

        return {
            provider: PAYMENT_GATEWAY_PROVIDERS.STRIPE,
            refundId: response.id,
            status: mapProviderRefundStatus(response.status),
            rawStatus: response.status || null
        };
    }

    verifyRazorpaySignature(payment, payload) {
        if (!this.razorpayKeySecret) {
            return true;
        }

        const orderId = payload.razorpayOrderId || payload.providerOrderId || payment.gateway?.orderId;
        const paymentId = payload.razorpayPaymentId || payload.providerPaymentId;
        const signature = payload.razorpaySignature || payload.providerSignature;

        if (!orderId || !paymentId || !signature) {
            throw AppError.badRequest('Razorpay payment signature is required');
        }

        const expectedSignature = crypto
            .createHmac('sha256', this.razorpayKeySecret)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');

        if (expectedSignature !== signature) {
            throw AppError.badRequest('Razorpay payment signature verification failed');
        }

        return true;
    }

    async providerFetch(url, options) {
        if (!this.fetchImpl) {
            throw AppError.badRequest('Payment provider HTTP client is not available');
        }

        const response = await this.fetchImpl(url, options);
        const responseBody = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw AppError.badRequest('Payment provider request failed', {
                provider: this.provider,
                statusCode: response.status,
                error: responseBody.error?.description || responseBody.error?.message || responseBody.message || null
            });
        }

        return responseBody;
    }

    createMockSession({ paymentCode, amount, currency, paymentMethod }) {
        const reference = `mock_${paymentMethod}_${Date.now()}`;

        return {
            provider: PAYMENT_GATEWAY_PROVIDERS.MOCK,
            status: PAYMENT_GATEWAY_STATUSES.REQUIRES_ACTION,
            orderId: `mock_order_${paymentCode}`,
            checkoutId: reference,
            clientSecret: `mock_secret_${paymentCode}`,
            paymentUrl: `/payments/mock-checkout/${paymentCode}`,
            gatewayReference: reference,
            rawStatus: PAYMENT_GATEWAY_STATUSES.REQUIRES_ACTION,
            amount,
            currency,
            lastEventAt: this.now()
        };
    }
}

const toBasicAuth = (username, password) => `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

const toSmallestCurrencyUnit = (amount) => Math.round((Number(amount) || 0) * 100);

const mapProviderRefundStatus = (status) => {
    if (['processed', 'succeeded', 'success'].includes(status)) {
        return PAYMENT_GATEWAY_STATUSES.REFUNDED;
    }

    if (['failed', 'failure'].includes(status)) {
        return PAYMENT_GATEWAY_STATUSES.FAILED;
    }

    return PAYMENT_GATEWAY_STATUSES.REFUND_REQUESTED;
};

const mapStripeRefundReason = (reason) => {
    if (reason === 'duplicate_payment') {
        return 'duplicate';
    }

    return 'requested_by_customer';
};
