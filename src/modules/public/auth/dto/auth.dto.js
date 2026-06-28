export const toPublicAuthUser = (user) => {
    const userObject = user.toObject ? user.toObject() : user;

    return {
        id: userObject._id?.toString() || userObject.id,
        role: userObject.role,
        fullName: userObject.fullName,
        email: userObject.email || null,
        phone: userObject.phone,
        accountStatus: userObject.accountStatus,
        createdAt: userObject.createdAt,
        updatedAt: userObject.updatedAt
    };
};

export const toAuthSessionDto = (user, tokens) => ({
    user: toPublicAuthUser(user),
    tokens
});

/**
 * auth.dto.js  = response shape
 */