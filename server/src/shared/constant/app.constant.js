export default {
    PORT: 3000,
    MONGO_URL: "mongodb://localhost:27017/rapido",
    LOGGER_LEVEL: 'info',
    NODE_ENV: 'development',
    CORS_ORIGIN: 'http://localhost:3000,http://localhost:5173',
    RATE_LIMIT_WINDOW: 15 * 60 * 1000,
    RATE_LIMIT: 100,
    ACCESS_SECRET_TOKEN: 'local-access-secret-change-me',
    REFRESH_SECRET_TOKEN: 'local-refresh-secret-change-me',
    ACCESS_TOKEN_EXPIRES_IN: '15m',
    REFRESH_TOKEN_EXPIRES_IN: '7d',
    PAYMENT_GATEWAY_PROVIDER: 'mock',
    RAZORPAY_KEY_ID: '',
    RAZORPAY_KEY_SECRET: '',
    STRIPE_SECRET_KEY: '',
    STRIPE_PUBLISHABLE_KEY: ''
}
