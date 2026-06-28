/**
 * Async Handler Utility
 * 
 * Wraps async Express route handlers to automatically catch errors
 * and pass them to the global error handling middleware.
 */

const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
    };
};

export default asyncHandler;
