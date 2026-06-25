import express from 'express'
import securityMiddlewares from './middlewares/security.middleware.js';

export default function createApp() {
    const app = express()

    if (env.NODE_ENV === 'development')
        app.use(morgan('dev'));

    securityMiddlewares(app);
}