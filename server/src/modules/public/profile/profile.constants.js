export const PROFILE_GENDERS = Object.freeze({
    FEMALE: 'female',
    MALE: 'male',
    NON_BINARY: 'non_binary',
    OTHER: 'other',
    PREFER_NOT_TO_SAY: 'prefer_not_to_say'
});

export const PROFILE_DEFAULT_PREFERENCES = Object.freeze({
    language: 'en',
    notifications: {
        sms: true,
        email: true,
        push: true
    }
});
