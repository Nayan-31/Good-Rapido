export const toPrivateAuthUser = (user) => {
    const userObject = user.toObject ? user.toObject() : user;

    return {
        id: userObject._id?.toString() || userObject.id,
        role: userObject.role,
        fullName: userObject.fullName,
        email: userObject.email || null,
        phone: userObject.phone,
        employeeCode: userObject.employeeCode || null,
        department: userObject.department || null,
        serviceZone: userObject.serviceZone || null,
        permissions: Array.isArray(userObject.permissions) ? userObject.permissions : [],
        accountStatus: userObject.accountStatus,
        lastLoginAt: userObject.lastLoginAt || null,
        createdAt: userObject.createdAt,
        updatedAt: userObject.updatedAt
    };
};

export const toPrivateAuthSessionDto = (user, tokens) => ({
    user: toPrivateAuthUser(user),
    tokens
});
