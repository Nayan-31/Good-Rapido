import AppError from '../utils/appError.js';

export const notFoundMiddleware = (req, _res, next) => {
    next(AppError.notFound(`Route ${req.originalUrl} not found`));
};

export const errorMiddleware = (err, _req, res, _next) => {
    const statusCode = err.statusCode || normalizeErrorStatus(err);
    const message = normalizeErrorMessage(err);

    return res.status(statusCode).json({
        success: false,
        message,
        ...(err.details ? { errors: err.details } : {})
    });
};

const normalizeErrorStatus = (err) => {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return 401;
    }

    if (err.code === 11000) {
        return 409;
    }

    return 500;
};

const normalizeErrorMessage = (err) => {
    if (err.name === 'JsonWebTokenError') {
        return 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        return 'Token expired';
    }

    if (err.code === 11000) {
        return 'Account already exists';
    }

    return err.isOperational ? err.message : 'Internal server error';
};
