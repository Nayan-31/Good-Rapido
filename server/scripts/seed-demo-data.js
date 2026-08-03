import mongoose from 'mongoose';

import { connectDB } from '../src/config/db.js';
import { AUTH_ACCOUNT_STATUSES, AUTH_ROLES } from '../src/modules/public/auth/auth.constants.js';
import PublicAuthUser from '../src/modules/public/auth/auth.model.js';
import {
    RIDE_BOOKING_DRIVER_POOL,
    RIDE_BOOKING_RISK_LEVELS
} from '../src/modules/public/ride-booking/ride-booking.constants.js';
import {
    DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_ROLES
} from '../src/modules/private/auth/auth.constants.js';
import PrivateAuthUser from '../src/modules/private/auth/auth.model.js';
import PasswordService from '../src/modules/private/auth/session/password.service.js';
import {
    DRIVER_APPROVAL_STATUSES,
    DRIVER_ONBOARDING_STATUSES,
    DRIVER_ONBOARDING_STEP_CATALOG,
    DRIVER_ONBOARDING_STEP_STATUSES
} from '../src/modules/private/driver/driver.constants.js';
import DriverProfile from '../src/modules/private/driver/driver.model.js';
import {
    DRIVER_AVAILABILITY_STATUSES,
    DRIVER_LOCATION_SOURCES
} from '../src/modules/private/driver-availability/driver-availability.constants.js';
import {
    DRIVER_DOCUMENT_COLLECTION_STATUSES,
    DRIVER_DOCUMENT_STATUSES,
    DRIVER_DOCUMENT_TYPES
} from '../src/modules/private/driver-documents/driver-documents.constants.js';
import {
    VEHICLE_FUEL_TYPES,
    VEHICLE_OWNERSHIP_TYPES,
    VEHICLE_STATUSES
} from '../src/modules/private/vehicle/vehicle.constants.js';
import {
    TRUST_PROFILE_STATUSES,
    TRUST_REVIEW_STATUSES,
    TRUST_RISK_LEVELS,
    TRUST_SUBJECT_TYPES
} from '../src/modules/private/trust/trust.constants.js';
import TrustProfile from '../src/modules/private/trust/trust.model.js';

const passwordService = new PasswordService();
const seedPassword = process.env.GOOD_RAPIDO_DEMO_PASSWORD || 'Password@123';
const shouldResetPasswords = process.env.GOOD_RAPIDO_DEMO_RESET_PASSWORDS !== 'false';

const riderSeeds = [
    {
        role: AUTH_ROLES.RIDER,
        fullName: 'Good Rapido Rider',
        email: 'rider@goodrapido.test',
        phone: '+919999000001'
    }
];

const privateUserSeeds = [
    {
        role: PRIVATE_AUTH_ROLES.ADMIN,
        fullName: 'Good Rapido Admin',
        email: 'admin@goodrapido.test',
        phone: '+919999100001',
        employeeCode: 'ADM-001',
        department: 'platform_admin',
        serviceZone: 'all'
    },
    {
        role: PRIVATE_AUTH_ROLES.OPS,
        fullName: 'Good Rapido Ops',
        email: 'ops@goodrapido.test',
        phone: '+919999100002',
        employeeCode: 'OPS-001',
        department: 'operations',
        serviceZone: 'kolkata'
    }
];

const driverSeeds = RIDE_BOOKING_DRIVER_POOL.map((driver, index) => ({
    ...driver,
    role: PRIVATE_AUTH_ROLES.DRIVER,
    email: toDriverEmail(driver.fullName),
    phone: `+91999920000${index + 1}`,
    employeeCode: toEmployeeCode(driver.id),
    department: 'driver_network',
    serviceZone: 'kolkata',
    location: toKolkataLocation(index)
}));

const vehicleCatalog = {
    drv_bike_arjun: { make: 'Honda', model: 'Activa', fuelType: VEHICLE_FUEL_TYPES.PETROL },
    drv_bike_sahil: { make: 'TVS', model: 'Ntorq', fuelType: VEHICLE_FUEL_TYPES.PETROL },
    drv_auto_imran: { make: 'Bajaj', model: 'RE', fuelType: VEHICLE_FUEL_TYPES.CNG },
    drv_cab_rajesh: { make: 'Suzuki', model: 'Dzire', fuelType: VEHICLE_FUEL_TYPES.PETROL },
    drv_cab_neha: { make: 'Hyundai', model: 'Aura', fuelType: VEHICLE_FUEL_TYPES.PETROL },
    drv_premium_amit: { make: 'Toyota', model: 'Innova', fuelType: VEHICLE_FUEL_TYPES.DIESEL }
};

async function seedDemoData() {
    await connectDB();

    const passwordHash = await passwordService.hash(seedPassword);
    const publicUsers = await upsertPublicUsers(passwordHash);
    const privateUsers = await upsertPrivateUsers(passwordHash);
    const drivers = await upsertDrivers(passwordHash);

    await upsertTrustProfiles({
        publicUsers,
        privateUsers,
        drivers
    });

    return {
        publicUsers,
        privateUsers,
        drivers
    };
}

async function upsertPublicUsers(passwordHash) {
    const users = [];

    for (const seed of riderSeeds) {
        const user = await upsertAuthUser({
            model: PublicAuthUser,
            role: seed.role,
            seed: normalizePublicSeed(seed),
            passwordHash,
            activeStatus: AUTH_ACCOUNT_STATUSES.ACTIVE
        });

        users.push(user);
    }

    return users;
}

async function upsertPrivateUsers(passwordHash) {
    const users = [];

    for (const seed of privateUserSeeds) {
        const user = await upsertAuthUser({
            model: PrivateAuthUser,
            role: seed.role,
            seed: normalizePrivateSeed(seed),
            passwordHash,
            activeStatus: PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE,
            permissions: [...(DEFAULT_PRIVATE_ROLE_PERMISSIONS[seed.role] || [])]
        });

        users.push(user);
    }

    return users;
}

async function upsertDrivers(passwordHash) {
    const drivers = [];

    for (const seed of driverSeeds) {
        const authUser = await upsertAuthUser({
            model: PrivateAuthUser,
            role: PRIVATE_AUTH_ROLES.DRIVER,
            seed: normalizePrivateSeed(seed),
            passwordHash,
            activeStatus: PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE,
            permissions: [...(DEFAULT_PRIVATE_ROLE_PERMISSIONS[PRIVATE_AUTH_ROLES.DRIVER] || [])]
        });
        const profile = await upsertDriverProfile(authUser, seed);

        drivers.push({
            authUser,
            profile
        });
    }

    return drivers;
}

async function upsertAuthUser({
    model,
    role,
    seed,
    passwordHash,
    activeStatus,
    permissions
}) {
    const contactFilters = [{ phone: seed.phone }];

    if (seed.email) {
        contactFilters.push({ email: seed.email });
    }

    const existingUser = await model.findOne({
        role,
        $or: contactFilters
    }).select('+passwordHash');
    const payload = {
        ...seed,
        role,
        accountStatus: activeStatus,
        ...(permissions ? { permissions } : {})
    };

    if (existingUser) {
        existingUser.set(payload);

        if (shouldResetPasswords) {
            existingUser.passwordHash = passwordHash;
        }

        return existingUser.save();
    }

    return model.create({
        ...payload,
        passwordHash
    });
}

async function upsertDriverProfile(authUser, seed) {
    const now = new Date();
    const vehicle = toDriverVehicle(seed, now);
    const payload = {
        authUserId: authUser._id,
        driverCode: seed.employeeCode,
        profile: {
            displayName: seed.fullName,
            bio: `${seed.fullName} is a verified Good Rapido demo driver.`,
            profilePhotoUrl: `https://goodrapido.test/demo/${seed.id}.jpg`,
            languages: ['Hindi', 'English']
        },
        service: {
            serviceZone: seed.serviceZone,
            vehicleTypes: [seed.vehicleType],
            experienceYears: Math.max(2, Math.round(seed.completedRides / 450)),
            preferredRadiusKm: 8
        },
        onboarding: {
            status: DRIVER_ONBOARDING_STATUSES.APPROVED,
            steps: DRIVER_ONBOARDING_STEP_CATALOG.map((step) => ({
                ...step,
                status: DRIVER_ONBOARDING_STEP_STATUSES.COMPLETED,
                completedAt: now,
                updatedAt: now
            })),
            submittedAt: now,
            reviewedAt: now
        },
        approvalStatus: DRIVER_APPROVAL_STATUSES.APPROVED,
        accountControls: {
            rideRequestsEnabled: true,
            marketingOptIn: true,
            safetyTrainingAccepted: true,
            preferredContactChannel: 'in_app'
        },
        availability: {
            status: DRIVER_AVAILABILITY_STATUSES.ONLINE,
            currentLocation: {
                type: 'Point',
                coordinates: [seed.location.longitude, seed.location.latitude],
                accuracyMeters: 18,
                headingDegrees: 90,
                speedKmph: 0,
                addressLabel: seed.location.address,
                source: DRIVER_LOCATION_SOURCES.GPS,
                capturedAt: now
            },
            activeServiceZones: [seed.serviceZone],
            statusReason: 'Demo driver ready for test bookings',
            lastOnlineAt: now,
            lastHeartbeatAt: now,
            updatedAt: now
        },
        documents: {
            status: DRIVER_DOCUMENT_COLLECTION_STATUSES.APPROVED,
            items: toApprovedDocuments(seed, now),
            submittedAt: now,
            reviewedAt: now
        },
        vehicles: [vehicle],
        latestActivityAt: now
    };
    const existingProfile = await DriverProfile.findOne({
        $or: [
            { authUserId: authUser._id },
            { driverCode: seed.employeeCode }
        ]
    });

    if (existingProfile) {
        existingProfile.set(payload);
        return existingProfile.save();
    }

    return DriverProfile.create(payload);
}

async function upsertTrustProfiles({ publicUsers, privateUsers, drivers }) {
    const adminUser = privateUsers.find((user) => user.role === PRIVATE_AUTH_ROLES.ADMIN);

    for (const user of publicUsers) {
        await upsertTrustProfile({
            trustCode: `TRUST-RIDER-${user.phone.replace(/\D/g, '').slice(-4)}`,
            subjectType: TRUST_SUBJECT_TYPES.RIDER,
            subjectId: user._id.toString(),
            subjectLabel: user.fullName,
            scores: {
                overall: 96,
                safety: 98,
                reliability: 94,
                payment: 97,
                cancellation: 95,
                fraud: 99
            },
            metrics: {
                completedRides: 24,
                cancelledRides: 1,
                disputeCount: 0,
                incidentCount: 0,
                paymentFailureCount: 0,
                ratingAverage: 4.8,
                lastRideAt: new Date()
            },
            actor: adminUser
        });
    }

    for (const { authUser, profile } of drivers) {
        await upsertTrustProfile({
            trustCode: `TRUST-${profile.driverCode}`,
            subjectType: TRUST_SUBJECT_TYPES.DRIVER,
            subjectId: profile.driverCode,
            subjectLabel: authUser.fullName,
            scores: {
                overall: scoreFromPool(authUser.fullName, 'trustScore'),
                safety: 96,
                reliability: scoreFromPool(authUser.fullName, 'reliabilityScore'),
                payment: 100,
                cancellation: 100 - scoreFromPool(authUser.fullName, 'cancellationRiskScore'),
                fraud: 98
            },
            metrics: {
                completedRides: scoreFromPool(authUser.fullName, 'completedRides'),
                cancelledRides: Math.max(1, Math.round(scoreFromPool(authUser.fullName, 'cancellationRatio'))),
                disputeCount: 0,
                incidentCount: 0,
                paymentFailureCount: 0,
                ratingAverage: scoreFromPool(authUser.fullName, 'rating'),
                lastRideAt: new Date()
            },
            actor: adminUser
        });
    }
}

async function upsertTrustProfile({
    trustCode,
    subjectType,
    subjectId,
    subjectLabel,
    scores,
    metrics,
    actor
}) {
    const now = new Date();
    const payload = {
        trustCode,
        subjectType,
        subjectId,
        subjectLabel,
        riskLevel: TRUST_RISK_LEVELS.LOW,
        status: TRUST_PROFILE_STATUSES.CLEAR,
        reviewStatus: TRUST_REVIEW_STATUSES.RESOLVED,
        scores,
        metrics,
        restrictions: {
            rideBookingBlocked: false,
            driverPayoutHold: false,
            promoBlocked: false
        },
        assignedReviewerId: actor?._id || null,
        latestReviewNote: 'Seeded demo trust profile for local testing',
        lastReviewedAt: now,
        lastReviewedBy: actor?._id || null,
        createdBy: actor?._id || null,
        updatedBy: actor?._id || null
    };
    const existingProfile = await TrustProfile.findOne({ subjectType, subjectId });

    if (existingProfile) {
        existingProfile.set(payload);
        return existingProfile.save();
    }

    return TrustProfile.create({
        ...payload,
        actionLog: [{
            action: 'create_profile',
            note: 'Seeded demo trust profile for local testing',
            actorId: actor?._id || null,
            actorRole: actor?.role || PRIVATE_AUTH_ROLES.ADMIN,
            createdAt: now
        }]
    });
}

const normalizePublicSeed = (seed) => ({
    fullName: seed.fullName.trim(),
    email: seed.email.trim().toLowerCase(),
    phone: seed.phone.trim()
});

const normalizePrivateSeed = (seed) => ({
    fullName: seed.fullName.trim(),
    email: seed.email.trim().toLowerCase(),
    phone: seed.phone.trim(),
    employeeCode: seed.employeeCode.trim().toUpperCase(),
    department: seed.department,
    serviceZone: seed.serviceZone
});

function toDriverEmail(fullName) {
    return `${fullName.toLowerCase().replace(/[^a-z0-9]+/g, '.')}.driver@goodrapido.test`;
}

function toEmployeeCode(driverId) {
    return driverId.toUpperCase().replace(/_/g, '-');
}

function toKolkataLocation(index) {
    const locations = [
        { address: 'Howrah Bridge driver stand', latitude: 22.5858, longitude: 88.3462 },
        { address: 'Park Street driver stand', latitude: 22.5542, longitude: 88.3527 },
        { address: 'Esplanade driver stand', latitude: 22.5646, longitude: 88.3519 },
        { address: 'Salt Lake driver stand', latitude: 22.5726, longitude: 88.4325 },
        { address: 'New Market driver stand', latitude: 22.5596, longitude: 88.3530 },
        { address: 'Ballygunge driver stand', latitude: 22.5279, longitude: 88.3652 }
    ];

    return locations[index] || locations[0];
}

const toDriverVehicle = (seed, now) => {
    const catalogItem = vehicleCatalog[seed.id] || {};

    return {
        vehicleId: `${seed.employeeCode}-VEH-001`,
        type: seed.vehicleType,
        make: catalogItem.make || seed.vehicleName.split(' ')[0] || 'Good Rapido',
        model: catalogItem.model || seed.vehicleName.split(' ').slice(1).join(' ') || seed.vehicleName,
        color: seed.vehicleColor,
        registrationNumber: seed.vehicleNumber.replace(/\s+/g, ''),
        manufacturingYear: 2022,
        ownershipType: VEHICLE_OWNERSHIP_TYPES.OWNED,
        fuelType: catalogItem.fuelType || VEHICLE_FUEL_TYPES.PETROL,
        insurance: {
            number: `${seed.employeeCode}-INS`,
            expiresAt: addDays(now, 365)
        },
        permit: {
            number: `${seed.employeeCode}-PERMIT`,
            expiresAt: addDays(now, 365)
        },
        fitness: {
            number: `${seed.employeeCode}-FIT`,
            expiresAt: addDays(now, 365)
        },
        status: VEHICLE_STATUSES.APPROVED,
        isPrimary: true,
        submittedAt: now,
        reviewedAt: now,
        notes: 'Approved demo vehicle',
        createdAt: now,
        updatedAt: now
    };
};

const toApprovedDocuments = (seed, now) => [
    DRIVER_DOCUMENT_TYPES.DRIVING_LICENSE,
    DRIVER_DOCUMENT_TYPES.IDENTITY_PROOF,
    DRIVER_DOCUMENT_TYPES.ADDRESS_PROOF,
    DRIVER_DOCUMENT_TYPES.PROFILE_PHOTO,
    DRIVER_DOCUMENT_TYPES.POLICE_VERIFICATION
].map((type) => ({
    type,
    status: DRIVER_DOCUMENT_STATUSES.APPROVED,
    documentNumber: `${seed.employeeCode}-${type.toUpperCase()}`,
    holderName: seed.fullName,
    fileUrl: `https://goodrapido.test/demo-documents/${seed.id}/${type}.pdf`,
    uploadedAt: now,
    submittedAt: now,
    reviewedAt: now,
    expiresAt: type === DRIVER_DOCUMENT_TYPES.DRIVING_LICENSE || type === DRIVER_DOCUMENT_TYPES.POLICE_VERIFICATION
        ? addDays(now, 365)
        : undefined,
    notes: 'Approved demo document'
}));

const scoreFromPool = (fullName, field) => {
    const driver = RIDE_BOOKING_DRIVER_POOL.find((item) => item.fullName === fullName);
    const fallback = field === 'rating' ? 4.8 : field === 'completedRides' ? 100 : 95;

    if (!driver) {
        return fallback;
    }

    if (driver[field] !== undefined) {
        return driver[field];
    }

    if (field === 'trustScore') {
        return driver.trustScore || fallback;
    }

    return fallback;
};

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const printSummary = ({ publicUsers, privateUsers, drivers }) => {
    console.log('Good Rapido demo data seeded.');
    console.log(`Password: ${seedPassword}`);
    console.log(`Password reset mode: ${shouldResetPasswords ? 'enabled' : 'disabled for existing users'}`);
    console.log('');
    console.log('Rider accounts');
    publicUsers.forEach((user) => console.log(`- ${user.email} (${user.phone})`));
    console.log('');
    console.log('Admin/Ops accounts');
    privateUsers.forEach((user) => console.log(`- ${user.role}: ${user.email} (${user.employeeCode})`));
    console.log('');
    console.log('Driver accounts');
    drivers.forEach(({ authUser, profile }) => {
        console.log(`- ${authUser.fullName}: ${authUser.email} (${profile.driverCode})`);
    });
};

seedDemoData()
    .then((result) => {
        printSummary(result);
    })
    .catch((error) => {
        console.error('Demo data seed failed');
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
