import AppError from '../utils/appError.js';

export const validate = (schema) => (req, _res, next) => {
    const parsed = schema.safeParse({
        body: req.body,
        params: req.params,
        query: req.query
    });

    if (!parsed.success) {
        const details = parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message
        }));

        return next(AppError.badRequest('Validation failed', details));
    }

    if (parsed.data.body !== undefined) {
        req.body = parsed.data.body;
    }

    if (parsed.data.params !== undefined) {
        req.params = parsed.data.params;
    }

    if (parsed.data.query !== undefined) {
        req.validatedQuery = parsed.data.query;
    }

    return next();
};
