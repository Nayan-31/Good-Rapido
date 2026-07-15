import express from 'express'
import morgan from 'morgan'
import env from './config/env.js'
import securityMiddlewares from './shared/middlewares/security.middleware.js';
import authRoutes from './modules/public/auth/auth.route.js';
import fareRoutes from './modules/public/fare/fare.route.js';
import profileRoutes from './modules/public/profile/profile.route.js';
import rideBookingRoutes from './modules/public/ride-booking/ride-booking.route.js';
import ridesRoutes from './modules/public/rides/rides.route.js';
import driversRoutes from './modules/public/drivers/drivers.route.js';
import paymentsRoutes from './modules/public/payments/payments.route.js';
import promosRoutes from './modules/public/promos/promos.route.js';
import ratingsRoutes from './modules/public/ratings/ratings.route.js';
import disputesRoutes from './modules/public/disputes/disputes.route.js';
import notificationsRoutes from './modules/public/notifications/notifications.route.js';
import supportRoutes from './modules/public/support/support.route.js';
import identityRoutes from './modules/core/identity/identity.route.js';
import rideLifecycleRoutes from './modules/core/ride-lifecycle/ride-lifecycle.route.js';
import pricingEngineRoutes from './modules/core/pricing-engine/pricing-engine.route.js';
import matchingEngineRoutes from './modules/core/matching-engine/matching-engine.route.js';
import privateAuthRoutes from './modules/private/auth/auth.route.js';
import privateAdminRoutes from './modules/private/admin/admin.route.js';
import privateAnalyticsRoutes from './modules/private/analytics/analytics.route.js';
import privateDriverRoutes from './modules/private/driver/driver.route.js';
import privateDriverAvailabilityRoutes from './modules/private/driver-availability/driver-availability.route.js';
import privateDriverDocumentsRoutes from './modules/private/driver-documents/driver-documents.route.js';
import privateDisputesRoutes from './modules/private/disputes/disputes.route.js';
import privateEarningsRoutes from './modules/private/earnings/earnings.route.js';
import privateFraudRoutes from './modules/private/fraud/fraud.route.js';
import privateNotificationsRoutes from './modules/private/notifications/notifications.route.js';
import privatePricingRoutes from './modules/private/pricing/pricing.route.js';
import privateRideOpsRoutes from './modules/private/ride-ops/ride-ops.route.js';
import privateSurgeRoutes from './modules/private/surge/surge.route.js';
import privateTrustRoutes from './modules/private/trust/trust.route.js';
import privateVehicleRoutes from './modules/private/vehicle/vehicle.route.js';
import { errorMiddleware, notFoundMiddleware } from './shared/middlewares/error.middleware.js';

export default function createApp() {
    const app = express()

    if (env.NODE_ENV === 'development')
        app.use(morgan('dev'));

    securityMiddlewares(app);

    app.get('/health', (_req, res) => {
        res.status(200).json({
            success: true,
            message: 'Good Rapido API is healthy'
        });
    });

    app.use('/api/v1/public/auth', authRoutes);
    app.use('/api/v1/public/profile', profileRoutes);
    app.use('/api/v1/public/fare', fareRoutes);
    app.use('/api/v1/public/ride-booking', rideBookingRoutes);
    app.use('/api/v1/public/rides', ridesRoutes);
    app.use('/api/v1/public/drivers', driversRoutes);
    app.use('/api/v1/public/payments', paymentsRoutes);
    app.use('/api/v1/public/promos', promosRoutes);
    app.use('/api/v1/public/ratings', ratingsRoutes);
    app.use('/api/v1/public/disputes', disputesRoutes);
    app.use('/api/v1/public/notifications', notificationsRoutes);
    app.use('/api/v1/public/support', supportRoutes);
    app.use('/api/v1/core/identity', identityRoutes);
    app.use('/api/v1/core/ride-lifecycle', rideLifecycleRoutes);
    app.use('/api/v1/core/pricing-engine', pricingEngineRoutes);
    app.use('/api/v1/core/matching-engine', matchingEngineRoutes);
    app.use('/api/v1/private/auth', privateAuthRoutes);
    app.use('/api/v1/private/admin', privateAdminRoutes);
    app.use('/api/v1/private/analytics', privateAnalyticsRoutes);
    app.use('/api/v1/private/driver', privateDriverRoutes);
    app.use('/api/v1/private/driver-availability', privateDriverAvailabilityRoutes);
    app.use('/api/v1/private/driver-documents', privateDriverDocumentsRoutes);
    app.use('/api/v1/private/disputes', privateDisputesRoutes);
    app.use('/api/v1/private/earnings', privateEarningsRoutes);
    app.use('/api/v1/private/fraud', privateFraudRoutes);
    app.use('/api/v1/private/notifications', privateNotificationsRoutes);
    app.use('/api/v1/private/pricing', privatePricingRoutes);
    app.use('/api/v1/private/ride-ops', privateRideOpsRoutes);
    app.use('/api/v1/private/surge', privateSurgeRoutes);
    app.use('/api/v1/private/trust', privateTrustRoutes);
    app.use('/api/v1/private/vehicle', privateVehicleRoutes);

    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
}
