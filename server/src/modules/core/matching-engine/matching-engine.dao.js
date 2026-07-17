import mongoose from 'mongoose';
import PublicAuthUser from '../../public/auth/auth.model.js';
import PrivateAuthUser from '../../private/auth/auth.model.js';
import DriverProfile from '../../private/driver/driver.model.js';
import {
    DRIVER_APPROVAL_STATUSES,
    DRIVER_ONBOARDING_STATUSES
} from '../../private/driver/driver.constants.js';
import { DRIVER_AVAILABILITY_STATUSES } from '../../private/driver-availability/driver-availability.constants.js';
import { MATCHING_ENGINE_DEFAULT_SERVICE_ZONE } from './matching-engine.constants.js';

export default class MatchingEngineDao {
    constructor(
        driverProfileModel = DriverProfile,
        publicAuthModel = PublicAuthUser,
        privateAuthModel = PrivateAuthUser
    ) {
        this.driverProfileModel = driverProfileModel;
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

    findAvailableDrivers({ vehicleType, serviceZone, limit = 25 } = {}) {
        const filter = {
            approvalStatus: DRIVER_APPROVAL_STATUSES.APPROVED,
            'onboarding.status': DRIVER_ONBOARDING_STATUSES.APPROVED,
            'accountControls.rideRequestsEnabled': true,
            'service.vehicleTypes': vehicleType,
            'availability.status': DRIVER_AVAILABILITY_STATUSES.ONLINE
        };

        if (serviceZone && serviceZone !== MATCHING_ENGINE_DEFAULT_SERVICE_ZONE) {
            filter['availability.activeServiceZones'] = serviceZone;
        }

        return this.driverProfileModel
            .find(filter)
            .sort({ 'availability.lastHeartbeatAt': -1, latestActivityAt: -1 })
            .limit(Math.max(limit, 25));
    }
}
