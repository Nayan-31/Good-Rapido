export default class AppError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true;
    }

    static badRequest(message, details = null) {
        return new AppError(message, 400, details);
    }

    static unauthorized(message = 'Unauthorized') {
        return new AppError(message, 401);
    }

    static forbidden(message = 'Forbidden') {
        return new AppError(message, 403);
    }

    static notFound(message = 'Resource not found') {
        return new AppError(message, 404);
    }

    static conflict(message = 'Resource already exists') {
        return new AppError(message, 409);
    }
}
