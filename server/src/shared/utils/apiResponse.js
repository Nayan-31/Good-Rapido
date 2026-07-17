export const buildSuccessResponse = ({ statusCode = 200, message, data = null }) => ({
    statusCode,
    body: {
        success: true,
        message,
        ...(data ? { data } : {})
    }
});

export const sendHttpResponse = (res, response) => {
    return res.status(response.statusCode).json(response.body);
};
