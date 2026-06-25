import express from 'express'
import morgan from 'morgan'
import env from './config/env.js'
import securityMiddlewares from './shared/middlewares/security.middleware.js';

export default function createApp() {
    const app = express()

    if (env.NODE_ENV === 'development')
        app.use(morgan('dev'));

    securityMiddlewares(app);

    return app;
}