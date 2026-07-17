import PrivateAuthUser from '../auth/auth.model.js';
import RideBooking from '../../public/ride-booking/ride-booking.model.js';
import Payment from '../../public/payments/payments.model.js';
import Dispute from '../../public/disputes/disputes.model.js';
import Rating from '../../public/ratings/ratings.model.js';
import DriverProfile from '../driver/driver.model.js';
import TrustProfile from '../trust/trust.model.js';
import FraudCase from '../fraud/fraud.model.js';

export default class AnalyticsDao {
    constructor({
        privateAuthModel = PrivateAuthUser,
        rideBookingModel = RideBooking,
        paymentModel = Payment,
        disputeModel = Dispute,
        ratingModel = Rating,
        driverProfileModel = DriverProfile,
        trustProfileModel = TrustProfile,
        fraudCaseModel = FraudCase
    } = {}) {
        this.privateAuthModel = privateAuthModel;
        this.rideBookingModel = rideBookingModel;
        this.paymentModel = paymentModel;
        this.disputeModel = disputeModel;
        this.ratingModel = ratingModel;
        this.driverProfileModel = driverProfileModel;
        this.trustProfileModel = trustProfileModel;
        this.fraudCaseModel = fraudCaseModel;
    }

    findPrivateUserById(userId) {
        return this.privateAuthModel.findById(userId);
    }

    findRideBookings({ from, to, limit = 100 } = {}) {
        return this.rideBookingModel
            .find(buildDateFilter({ from, to }))
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    findPayments({ from, to, limit = 100 } = {}) {
        return this.paymentModel
            .find(buildDateFilter({ from, to }))
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    findDisputes({ from, to, limit = 100 } = {}) {
        return this.disputeModel
            .find(buildDateFilter({ from, to }))
            .sort({ latestActivityAt: -1, createdAt: -1 })
            .limit(limit);
    }

    findRatings({ from, to, limit = 100 } = {}) {
        const filter = {};

        if (from || to) {
            filter.submittedAt = {
                ...(from ? { $gte: from } : {}),
                ...(to ? { $lte: to } : {})
            };
        }

        return this.ratingModel
            .find(filter)
            .sort({ submittedAt: -1, createdAt: -1 })
            .limit(limit);
    }

    findDriverProfiles({ limit = 100 } = {}) {
        return this.driverProfileModel
            .find({})
            .sort({ latestActivityAt: -1, updatedAt: -1 })
            .limit(limit);
    }

    findTrustProfiles({ from, to, limit = 100 } = {}) {
        return this.trustProfileModel
            .find(buildDateFilter({ from, to }))
            .sort({ updatedAt: -1, createdAt: -1 })
            .limit(limit);
    }

    findFraudCases({ from, to, limit = 100 } = {}) {
        return this.fraudCaseModel
            .find(buildDateFilter({ from, to }))
            .sort({ riskScore: -1, updatedAt: -1, createdAt: -1 })
            .limit(limit);
    }
}

const buildDateFilter = ({ from, to } = {}) => {
    if (!from && !to) {
        return {};
    }

    return {
        createdAt: {
            ...(from ? { $gte: from } : {}),
            ...(to ? { $lte: to } : {})
        }
    };
};
