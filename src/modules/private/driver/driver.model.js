import mongoose from 'mongoose';
import {
    DRIVER_APPROVAL_STATUSES,
    DRIVER_CONTACT_CHANNELS,
    DRIVER_DEFAULT_PREFERRED_RADIUS_KM,
    DRIVER_ONBOARDING_STATUSES,
    DRIVER_ONBOARDING_STEP_CATALOG,
    DRIVER_ONBOARDING_STEP_KEYS,
    DRIVER_ONBOARDING_STEP_STATUSES,
    DRIVER_VEHICLE_TYPES
} from './driver.constants.js';
import {
    DRIVER_AVAILABILITY_STATUSES,
    DRIVER_LOCATION_SOURCES
} from '../driver-availability/driver-availability.constants.js';
import {
    DRIVER_DOCUMENT_COLLECTION_STATUSES,
    DRIVER_DOCUMENT_STATUSES,
    DRIVER_DOCUMENT_TYPES
} from '../driver-documents/driver-documents.constants.js';
import {
    VEHICLE_FUEL_TYPES,
    VEHICLE_OWNERSHIP_TYPES,
    VEHICLE_STATUSES
} from '../vehicle/vehicle.constants.js';

const driverPublicProfileSchema = new mongoose.Schema(
    {
        displayName: {
            type: String,
            trim: true,
            maxlength: 80
        },
        bio: {
            type: String,
            trim: true,
            maxlength: 300
        },
        profilePhotoUrl: {
            type: String,
            trim: true,
            maxlength: 500
        },
        languages: [{
            type: String,
            trim: true,
            maxlength: 40
        }]
    },
    { _id: false }
);

const driverServiceProfileSchema = new mongoose.Schema(
    {
        serviceZone: {
            type: String,
            trim: true,
            maxlength: 80
        },
        vehicleTypes: [{
            type: String,
            enum: Object.values(DRIVER_VEHICLE_TYPES)
        }],
        experienceYears: {
            type: Number,
            min: 0,
            max: 60
        },
        preferredRadiusKm: {
            type: Number,
            min: 1,
            max: 100,
            default: DRIVER_DEFAULT_PREFERRED_RADIUS_KM
        }
    },
    { _id: false }
);

const onboardingStepSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            enum: Object.values(DRIVER_ONBOARDING_STEP_KEYS),
            required: true
        },
        label: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80
        },
        required: {
            type: Boolean,
            default: true
        },
        status: {
            type: String,
            enum: Object.values(DRIVER_ONBOARDING_STEP_STATUSES),
            default: DRIVER_ONBOARDING_STEP_STATUSES.PENDING
        },
        note: {
            type: String,
            trim: true,
            maxlength: 240
        },
        completedAt: {
            type: Date
        },
        updatedAt: {
            type: Date
        }
    },
    { _id: false }
);

const onboardingSchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: Object.values(DRIVER_ONBOARDING_STATUSES),
            default: DRIVER_ONBOARDING_STATUSES.NOT_STARTED,
            index: true
        },
        steps: {
            type: [onboardingStepSchema],
            default: () => DRIVER_ONBOARDING_STEP_CATALOG.map((step) => ({
                ...step,
                status: DRIVER_ONBOARDING_STEP_STATUSES.PENDING
            }))
        },
        submittedAt: {
            type: Date
        },
        reviewedAt: {
            type: Date
        },
        rejectionReason: {
            type: String,
            trim: true,
            maxlength: 500
        }
    },
    { _id: false }
);

const accountControlsSchema = new mongoose.Schema(
    {
        rideRequestsEnabled: {
            type: Boolean,
            default: false
        },
        marketingOptIn: {
            type: Boolean,
            default: true
        },
        safetyTrainingAccepted: {
            type: Boolean,
            default: false
        },
        preferredContactChannel: {
            type: String,
            enum: Object.values(DRIVER_CONTACT_CHANNELS),
            default: DRIVER_CONTACT_CHANNELS.IN_APP
        },
        deactivationRequestedAt: {
            type: Date
        },
        deactivationReason: {
            type: String,
            trim: true,
            maxlength: 500
        }
    },
    { _id: false }
);

const driverLocationSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            validate: {
                validator(value = []) {
                    if (!value.length) {
                        return true;
                    }

                    const [longitude, latitude] = value;

                    return value.length === 2
                        && longitude >= -180
                        && longitude <= 180
                        && latitude >= -90
                        && latitude <= 90;
                },
                message: 'Location coordinates must be [longitude, latitude]'
            }
        },
        accuracyMeters: {
            type: Number,
            min: 0,
            max: 5000
        },
        headingDegrees: {
            type: Number,
            min: 0,
            max: 359
        },
        speedKmph: {
            type: Number,
            min: 0,
            max: 200
        },
        addressLabel: {
            type: String,
            trim: true,
            maxlength: 160
        },
        source: {
            type: String,
            enum: Object.values(DRIVER_LOCATION_SOURCES),
            default: DRIVER_LOCATION_SOURCES.GPS
        },
        capturedAt: {
            type: Date
        }
    },
    { _id: false }
);

const availabilitySchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: Object.values(DRIVER_AVAILABILITY_STATUSES),
            default: DRIVER_AVAILABILITY_STATUSES.OFFLINE,
            index: true
        },
        currentLocation: {
            type: driverLocationSchema
        },
        activeServiceZones: [{
            type: String,
            trim: true,
            lowercase: true,
            maxlength: 80
        }],
        statusReason: {
            type: String,
            trim: true,
            maxlength: 240
        },
        lastOnlineAt: {
            type: Date
        },
        lastOfflineAt: {
            type: Date
        },
        lastHeartbeatAt: {
            type: Date
        },
        updatedAt: {
            type: Date
        }
    },
    { _id: false }
);

const driverDocumentItemSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: Object.values(DRIVER_DOCUMENT_TYPES),
            required: true
        },
        status: {
            type: String,
            enum: Object.values(DRIVER_DOCUMENT_STATUSES),
            default: DRIVER_DOCUMENT_STATUSES.UPLOADED,
            index: true
        },
        documentNumber: {
            type: String,
            trim: true,
            maxlength: 80
        },
        holderName: {
            type: String,
            trim: true,
            maxlength: 120
        },
        fileUrl: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500
        },
        backFileUrl: {
            type: String,
            trim: true,
            maxlength: 500
        },
        issuedAt: {
            type: Date
        },
        expiresAt: {
            type: Date
        },
        uploadedAt: {
            type: Date,
            required: true
        },
        submittedAt: {
            type: Date
        },
        reviewedAt: {
            type: Date
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PrivateAuthUser'
        },
        rejectionReason: {
            type: String,
            trim: true,
            maxlength: 500
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 240
        }
    },
    { _id: false }
);

const driverDocumentsSchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: Object.values(DRIVER_DOCUMENT_COLLECTION_STATUSES),
            default: DRIVER_DOCUMENT_COLLECTION_STATUSES.NOT_STARTED,
            index: true
        },
        items: {
            type: [driverDocumentItemSchema],
            default: []
        },
        submittedAt: {
            type: Date
        },
        reviewedAt: {
            type: Date
        },
        rejectionReason: {
            type: String,
            trim: true,
            maxlength: 500
        }
    },
    { _id: false }
);

const vehicleComplianceSchema = new mongoose.Schema(
    {
        number: {
            type: String,
            trim: true,
            maxlength: 80
        },
        expiresAt: {
            type: Date
        }
    },
    { _id: false }
);

const driverVehicleSchema = new mongoose.Schema(
    {
        vehicleId: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            maxlength: 40
        },
        type: {
            type: String,
            enum: Object.values(DRIVER_VEHICLE_TYPES),
            required: true,
            index: true
        },
        make: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80
        },
        model: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80
        },
        variant: {
            type: String,
            trim: true,
            maxlength: 80
        },
        color: {
            type: String,
            required: true,
            trim: true,
            maxlength: 40
        },
        registrationNumber: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            maxlength: 24
        },
        manufacturingYear: {
            type: Number,
            min: 1990,
            max: 2100
        },
        ownershipType: {
            type: String,
            enum: Object.values(VEHICLE_OWNERSHIP_TYPES),
            default: VEHICLE_OWNERSHIP_TYPES.OWNED
        },
        fuelType: {
            type: String,
            enum: Object.values(VEHICLE_FUEL_TYPES),
            default: VEHICLE_FUEL_TYPES.PETROL
        },
        insurance: {
            type: vehicleComplianceSchema,
            default: {}
        },
        permit: {
            type: vehicleComplianceSchema,
            default: {}
        },
        fitness: {
            type: vehicleComplianceSchema,
            default: {}
        },
        status: {
            type: String,
            enum: Object.values(VEHICLE_STATUSES),
            default: VEHICLE_STATUSES.DRAFT,
            index: true
        },
        isPrimary: {
            type: Boolean,
            default: false,
            index: true
        },
        submittedAt: {
            type: Date
        },
        reviewedAt: {
            type: Date
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PrivateAuthUser'
        },
        rejectionReason: {
            type: String,
            trim: true,
            maxlength: 500
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 240
        },
        createdAt: {
            type: Date,
            required: true
        },
        updatedAt: {
            type: Date,
            required: true
        }
    },
    { _id: false }
);

const driverProfileSchema = new mongoose.Schema(
    {
        authUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PrivateAuthUser',
            required: true,
            unique: true,
            index: true
        },
        driverCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            index: true
        },
        profile: {
            type: driverPublicProfileSchema,
            default: {}
        },
        service: {
            type: driverServiceProfileSchema,
            default: {}
        },
        onboarding: {
            type: onboardingSchema,
            default: {}
        },
        approvalStatus: {
            type: String,
            enum: Object.values(DRIVER_APPROVAL_STATUSES),
            default: DRIVER_APPROVAL_STATUSES.PENDING,
            index: true
        },
        accountControls: {
            type: accountControlsSchema,
            default: {}
        },
        availability: {
            type: availabilitySchema,
            default: {}
        },
        documents: {
            type: driverDocumentsSchema,
            default: {}
        },
        vehicles: {
            type: [driverVehicleSchema],
            default: []
        },
        latestActivityAt: {
            type: Date,
            required: true,
            index: true
        }
    },
    {
        collection: 'private_driver_profiles',
        timestamps: true,
        versionKey: false
    }
);

driverProfileSchema.index({ approvalStatus: 1, latestActivityAt: -1 });
driverProfileSchema.index({ 'onboarding.status': 1, latestActivityAt: -1 });
driverProfileSchema.index({ 'service.serviceZone': 1, approvalStatus: 1 });
driverProfileSchema.index({ 'availability.status': 1, 'availability.lastHeartbeatAt': -1 });
driverProfileSchema.index({ 'availability.activeServiceZones': 1, 'availability.status': 1 });
driverProfileSchema.index({ 'availability.currentLocation': '2dsphere' }, { sparse: true });
driverProfileSchema.index({ 'documents.status': 1, 'documents.submittedAt': 1 });
driverProfileSchema.index({ 'documents.items.type': 1, 'documents.items.status': 1 });
driverProfileSchema.index({ 'vehicles.vehicleId': 1 });
driverProfileSchema.index({ 'vehicles.registrationNumber': 1 });
driverProfileSchema.index({ 'vehicles.status': 1, 'vehicles.submittedAt': 1 });

const DriverProfile = mongoose.models.DriverProfile
    || mongoose.model('DriverProfile', driverProfileSchema);

export default DriverProfile;
