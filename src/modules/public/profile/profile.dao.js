import Profile from './profile.model.js';

export default class ProfileDao {
    constructor(model = Profile) {
        this.model = model;
    }

    create(payload) {
        return this.model.create(payload);
    }

    findByAuthUserIdAndRole(authUserId, role) {
        return this.model.findOne({ authUserId, role });
    }

    updateProfile(authUserId, role, payload) {
        return this.model.findOneAndUpdate(
            { authUserId, role },
            { $set: payload },
            { new: true, runValidators: true }
        );
    }

    updatePreferences(authUserId, role, preferences) {
        return this.model.findOneAndUpdate(
            { authUserId, role },
            { $set: toDotSet('preferences', preferences) },
            { new: true, runValidators: true }
        );
    }

    addSavedAddress(authUserId, role, address) {
        return this.model.findOneAndUpdate(
            { authUserId, role },
            { $push: { savedAddresses: address } },
            { new: true, runValidators: true }
        );
    }

    updateSavedAddress(authUserId, role, addressId, address) {
        return this.model.findOneAndUpdate(
            { authUserId, role, 'savedAddresses._id': addressId },
            { $set: toDotSet('savedAddresses.$', address) },
            { new: true, runValidators: true }
        );
    }

    removeSavedAddress(authUserId, role, addressId) {
        return this.model.findOneAndUpdate(
            { authUserId, role, 'savedAddresses._id': addressId },
            { $pull: { savedAddresses: { _id: addressId } } },
            { new: true, runValidators: true }
        );
    }

    addEmergencyContact(authUserId, role, contact) {
        return this.model.findOneAndUpdate(
            { authUserId, role },
            { $push: { emergencyContacts: contact } },
            { new: true, runValidators: true }
        );
    }

    updateEmergencyContact(authUserId, role, contactId, contact) {
        return this.model.findOneAndUpdate(
            { authUserId, role, 'emergencyContacts._id': contactId },
            { $set: toDotSet('emergencyContacts.$', contact) },
            { new: true, runValidators: true }
        );
    }

    removeEmergencyContact(authUserId, role, contactId) {
        return this.model.findOneAndUpdate(
            { authUserId, role, 'emergencyContacts._id': contactId },
            { $pull: { emergencyContacts: { _id: contactId } } },
            { new: true, runValidators: true }
        );
    }
}

const toDotSet = (prefix, values) => {
    return Object.entries(values).reduce((set, [key, value]) => {
        if (value === undefined) {
            return set;
        }

        if (isPlainObject(value)) {
            return {
                ...set,
                ...toDotSet(`${prefix}.${key}`, value)
            };
        }

        return {
            ...set,
            [`${prefix}.${key}`]: value
        };
    }, {});
};

const isPlainObject = (value) => {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
};
