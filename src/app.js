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

    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
}
