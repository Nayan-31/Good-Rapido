import mongoose from 'mongoose';
import PrivateAuthUser from '../../private/auth/auth.model.js';

export default class FraudEngineDao {
    constructor(privateAuthModel = PrivateAuthUser) {
        this.privateAuthModel = privateAuthModel;
    }

    findPrivateUserById(userId) {
        if (!mongoose.isValidObjectId(userId)) {
            return null;
        }

        return this.privateAuthModel.findById(userId);
    }
}
