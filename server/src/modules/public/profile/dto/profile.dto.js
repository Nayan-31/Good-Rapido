export const toPublicProfile = (profile) => {
    const profileObject = profile.toObject ? profile.toObject() : profile;

    return {
        id: profileObject._id?.toString() || profileObject.id,
        authUserId: profileObject.authUserId?.toString() || profileObject.authUserId,
        role: profileObject.role,
        displayName: profileObject.displayName || null,
        avatarUrl: profileObject.avatarUrl || null,
        dateOfBirth: profileObject.dateOfBirth || null,
        gender: profileObject.gender || null,
        savedAddresses: (profileObject.savedAddresses || []).map(toPublicSavedAddress),
        emergencyContacts: (profileObject.emergencyContacts || []).map(toPublicEmergencyContact),
        preferences: {
            language: profileObject.preferences?.language || 'en',
            notifications: {
                sms: profileObject.preferences?.notifications?.sms ?? true,
                email: profileObject.preferences?.notifications?.email ?? true,
                push: profileObject.preferences?.notifications?.push ?? true
            }
        },
        createdAt: profileObject.createdAt,
        updatedAt: profileObject.updatedAt
    };
};

const toPublicSavedAddress = (address) => {
    const addressObject = address.toObject ? address.toObject() : address;

    return {
        id: addressObject._id?.toString() || addressObject.id,
        label: addressObject.label,
        addressLine: addressObject.addressLine,
        city: addressObject.city || null,
        state: addressObject.state || null,
        country: addressObject.country || null,
        pincode: addressObject.pincode || null,
        location: addressObject.location || null,
        isDefault: Boolean(addressObject.isDefault),
        createdAt: addressObject.createdAt,
        updatedAt: addressObject.updatedAt
    };
};

const toPublicEmergencyContact = (contact) => {
    const contactObject = contact.toObject ? contact.toObject() : contact;

    return {
        id: contactObject._id?.toString() || contactObject.id,
        name: contactObject.name,
        phone: contactObject.phone,
        relationship: contactObject.relationship || null,
        createdAt: contactObject.createdAt,
        updatedAt: contactObject.updatedAt
    };
};
