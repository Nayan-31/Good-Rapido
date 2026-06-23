import express from 'express'

export default function createApp() {
    const app = express()

    if (env.NODE_ENV === 'development')
        app.use(morgan('dev'));

    securityMiddlewares(app);
}