import mongoose from 'mongoose';
import PublicAuthUser from '../../public/auth/auth.model.js';
import PrivateAuthUser from '../../private/auth/auth.model.js';

export default class TrustEngineDao {
    constructor(
        publicAuthModel = PublicAuthUser,
        privateAuthModel = PrivateAuthUser
    ) {
        this.publicAuthModel = publicAuthModel;
        this.privateAuthModel = privateAuthModel;
    }

    findPublicUserById(userId) {
        if (!mongoose.isValidObjectId(userId)) {
            return null;
        }

        return this.publicAuthModel.findById(userId);
    }

    findPrivateUserById(userId) {
        if (!mongoose.isValidObjectId(userId)) {
            return null;
        }

        return this.privateAuthModel.findById(userId);
    }
}
