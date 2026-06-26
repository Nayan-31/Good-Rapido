import AuthUser from './auth.model.js';

export default class AuthDao {
    constructor(model = AuthUser) {
        this.model = model;
    }

    create(payload) {
        return this.model.create(payload);
    }

    findOne(filter, projection = null) {
        const query = this.model.findOne(filter);
        return projection ? query.select(projection) : query;
    }

    findByIdAndRole(id, role, projection = null) {
        return this.findOne({ _id: id, role }, projection);
    }

    findExistingContact(role, { email, phone }) {
        const contactFilters = [];

        if (email) {
            contactFilters.push({ email });
        }

        if (phone) {
            contactFilters.push({ phone });
        }

        if (!contactFilters.length) {
            return null;
        }

        return this.findOne({ role, $or: contactFilters });
    }

    findByIdentifier(role, identifier, projection = null) {
        return this.findOne({ role, ...identifier }, projection);
    }

    updateSession(userId, role, refreshTokenHash) {
        return this.model.updateOne(
            { _id: userId, role },
            {
                $set: {
                    refreshTokenHash,
                    lastLoginAt: new Date()
                }
            }
        );
    }

    clearSession(userId, role) {
        return this.model.updateOne(
            { _id: userId, role },
            {
                $unset: { refreshTokenHash: '' }
            }
        );
    }
}
