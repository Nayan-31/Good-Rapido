import mongoose from 'mongoose';

import { connectDB } from '../src/config/db.js';
import { AUTH_ACCOUNT_STATUSES, AUTH_ROLES } from '../src/modules/public/auth/auth.constants.js';
import PublicAuthUser from '../src/modules/public/auth/auth.model.js';
import {
    DISPUTE_EVIDENCE_TYPES,
    DISPUTE_PRIORITIES,
    DISPUTE_REASONS,
    DISPUTE_REQUESTED_RESOLUTIONS,
    DISPUTE_STATUSES,
    DISPUTE_TYPES
} from '../src/modules/public/disputes/disputes.constants.js';
import Dispute from '../src/modules/public/disputes/disputes.model.js';
import {
    FARE_CONFIDENCE_LEVELS,
    FARE_CURRENCY,
    FARE_SURGE_LEVELS,
    FARE_VEHICLE_PRICING,
    FARE_VEHICLE_TYPES
} from '../src/modules/public/fare/fare.constants.js';
import FareEstimate from '../src/modules/public/fare/fare.model.js';
import { KNOWN_LOCATIONS } from '../src/modules/public/location-search/location-search.constants.js';
import {
    NOTIFICATION_CATEGORIES,
    NOTIFICATION_CHANNELS,
    NOTIFICATION_ENTITY_TYPES,
    NOTIFICATION_PRIORITIES,
    NOTIFICATION_STATUSES,
    NOTIFICATION_TYPES
} from '../src/modules/public/notifications/notifications.constants.js';
import Notification from '../src/modules/public/notifications/notifications.model.js';
import {
    PAYMENT_GATEWAY_PROVIDERS,
    PAYMENT_GATEWAY_STATUSES,
    PAYMENT_METHODS,
    PAYMENT_STATUSES
} from '../src/modules/public/payments/payments.constants.js';
import Payment from '../src/modules/public/payments/payments.model.js';
import {
    RIDE_BOOKING_DRIVER_POOL,
    RIDE_BOOKING_STATUSES,
    RIDE_BOOKING_RISK_LEVELS
} from '../src/modules/public/ride-booking/ride-booking.constants.js';
import RideBooking from '../src/modules/public/ride-booking/ride-booking.model.js';
import {
    SUPPORT_ATTACHMENT_TYPES,
    SUPPORT_CATEGORIES,
    SUPPORT_CHANNELS,
    SUPPORT_CONTACT_METHODS,
    SUPPORT_ENTITY_TYPES,
    SUPPORT_MESSAGE_SENDERS,
    SUPPORT_PRIORITIES,
    SUPPORT_STATUSES
} from '../src/modules/public/support/support.constants.js';
import SupportTicket from '../src/modules/public/support/support.model.js';
import { RIDE_LIFECYCLE_EVENTS } from '../src/modules/core/ride-lifecycle/ride-lifecycle.constants.js';
import {
    DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_ROLES
} from '../src/modules/private/auth/auth.constants.js';
import PrivateAuthUser from '../src/modules/private/auth/auth.model.js';
import PasswordService from '../src/modules/private/auth/session/password.service.js';
import {
    FRAUD_ACTION_TYPES,
    FRAUD_CASE_SOURCES,
    FRAUD_CASE_STATUSES,
    FRAUD_CASE_TYPES,
    FRAUD_EVIDENCE_TYPES,
    FRAUD_SEVERITY_LEVELS,
    FRAUD_SUBJECT_TYPES
} from '../src/modules/private/fraud/fraud.constants.js';
import FraudCase from '../src/modules/private/fraud/fraud.model.js';
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
    location: toDriverLocation(driver, index)
}));

const vehicleCatalog = {
    drv_bike_arjun: { make: 'Honda', model: 'Activa', fuelType: VEHICLE_FUEL_TYPES.PETROL },
    drv_bike_sahil: { make: 'TVS', model: 'Ntorq', fuelType: VEHICLE_FUEL_TYPES.PETROL },
    drv_auto_imran: { make: 'Bajaj', model: 'RE', fuelType: VEHICLE_FUEL_TYPES.CNG },
    drv_cab_rajesh: { make: 'Suzuki', model: 'Dzire', fuelType: VEHICLE_FUEL_TYPES.PETROL },
    drv_cab_neha: { make: 'Hyundai', model: 'Aura', fuelType: VEHICLE_FUEL_TYPES.PETROL },
    drv_premium_amit: { make: 'Toyota', model: 'Innova', fuelType: VEHICLE_FUEL_TYPES.DIESEL }
};

const knownLocationMap = new Map(KNOWN_LOCATIONS.map((location) => [location.id, location]));

const demoRideSeeds = [
    {
        bookingCode: 'GR-DEMO-PENDING-MURI-SILLI',
        driverId: 'drv_bike_arjun',
        pickupId: 'local_muri',
        dropoffId: 'local_silli',
        vehicleType: FARE_VEHICLE_TYPES.BIKE,
        status: RIDE_BOOKING_STATUSES.DRIVER_SELECTED,
        lifecycleStage: 'pending_confirmation',
        requestedMinutesAgo: 6,
        expiresMinutesFromNow: 12,
        totalFare: 96,
        distanceKm: 4.39,
        durationMinutes: 14,
        surgeMultiplier: 1.1,
        confidenceScore: 86,
        ops: {
            priority: 'normal',
            issueStatus: 'none',
            lastAction: 'demo_seeded',
            lastActionNote: 'Seeded request for predictable rider-driver handoff demo'
        }
    },
    {
        bookingCode: 'GR-DEMO-COMPLETE-KOL-001',
        driverId: 'drv_auto_imran',
        pickupId: 'local_howrah_bridge',
        dropoffId: 'local_park_street',
        vehicleType: FARE_VEHICLE_TYPES.AUTO,
        status: RIDE_BOOKING_STATUSES.CONFIRMED,
        lifecycleStage: 'completed',
        requestedMinutesAgo: 180,
        completedMinutesAgo: 125,
        expiresMinutesFromNow: 10,
        totalFare: 184,
        distanceKm: 6.8,
        durationMinutes: 22,
        surgeMultiplier: 1.2,
        confidenceScore: 91,
        ops: {
            priority: 'normal',
            issueStatus: 'resolved',
            lastAction: 'ride_completed',
            lastActionNote: 'Seeded completed ride for earnings and history demo'
        }
    },
    {
        bookingCode: 'GR-DEMO-DISPUTE-NCR-001',
        driverId: 'drv_cab_rajesh',
        pickupId: 'local_connaught_place',
        dropoffId: 'local_noida',
        vehicleType: FARE_VEHICLE_TYPES.CAB_ECONOMY,
        status: RIDE_BOOKING_STATUSES.CONFIRMED,
        lifecycleStage: 'completed',
        requestedMinutesAgo: 1440,
        completedMinutesAgo: 1390,
        expiresMinutesFromNow: 10,
        totalFare: 642,
        distanceKm: 18.4,
        durationMinutes: 42,
        surgeMultiplier: 1.35,
        confidenceScore: 78,
        ops: {
            priority: 'high',
            issueStatus: 'monitoring',
            lastAction: 'fare_review_opened',
            lastActionNote: 'Seeded dispute example for ops review demo'
        }
    }
];

async function seedDemoData() {
    await connectDB();

    const passwordHash = await passwordService.hash(seedPassword);
    const publicUsers = await upsertPublicUsers(passwordHash);
    const privateUsers = await upsertPrivateUsers(passwordHash);
    const drivers = await upsertDrivers(passwordHash);
    const cleanup = await resetDemoOperationalData({
        publicUsers,
        privateUsers,
        drivers
    });

    await upsertTrustProfiles({
        publicUsers,
        privateUsers,
        drivers
    });
    const demoRides = await upsertDemoRides({
        rider: publicUsers[0],
        privateUsers,
        now: new Date()
    });
    const payments = await upsertDemoPayments({
        rider: publicUsers[0],
        demoRides,
        now: new Date()
    });
    const disputes = await upsertDemoDisputes({
        rider: publicUsers[0],
        privateUsers,
        demoRides,
        now: new Date()
    });
    const fraudCases = await upsertDemoFraudCases({
        rider: publicUsers[0],
        privateUsers,
        demoRides,
        payments,
        now: new Date()
    });
    const notifications = await upsertDemoNotifications({
        rider: publicUsers[0],
        privateUsers,
        drivers,
        demoRides,
        payments,
        disputes,
        now: new Date()
    });
    const supportTickets = await upsertDemoSupportTickets({
        rider: publicUsers[0],
        demoRides,
        disputes,
        now: new Date()
    });

    return {
        publicUsers,
        privateUsers,
        drivers,
        demoRides,
        payments,
        disputes,
        fraudCases,
        notifications,
        supportTickets,
        cleanup
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
            profile,
            seed
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

async function resetDemoOperationalData({ publicUsers, privateUsers, drivers }) {
    const publicAuthUserIds = publicUsers.map((user) => user._id);
    const privateAuthUserIds = [
        ...privateUsers.map((user) => user._id),
        ...drivers.map(({ authUser }) => authUser._id)
    ];
    const driverIds = drivers.flatMap(({ authUser, profile }) => [
        authUser._id,
        authUser.id,
        profile._id,
        profile.driverCode,
        profile.driverCode?.toLowerCase?.().replace(/-/g, '_')
    ].filter(Boolean));

    const [
        fares,
        rides,
        payments,
        disputes,
        fraudCases,
        notifications,
        supportTickets
    ] = await Promise.all([
        FareEstimate.deleteMany({
            authUserId: { $in: publicAuthUserIds }
        }),
        RideBooking.deleteMany({
            $or: [
                { authUserId: { $in: publicAuthUserIds } },
                { bookingCode: /^GR-DEMO-/ },
                { 'selectedDriver.driverId': { $in: driverIds } }
            ]
        }),
        Payment.deleteMany({
            $or: [
                { authUserId: { $in: publicAuthUserIds } },
                { paymentCode: /^PAY-DEMO-/ },
                { rideCode: /^GR-DEMO-/ }
            ]
        }),
        Dispute.deleteMany({
            $or: [
                { authUserId: { $in: publicAuthUserIds } },
                { disputeCode: /^DSP-DEMO-/ },
                { 'relatedEntity.code': /^GR-DEMO-/ }
            ]
        }),
        FraudCase.deleteMany({
            $or: [
                { caseCode: /^FRD-DEMO-/ },
                { 'subject.authUserId': { $in: publicAuthUserIds } },
                { 'linkedEntities.rideCode': /^GR-DEMO-/ }
            ]
        }),
        Notification.deleteMany({
            $or: [
                { authUserId: { $in: [...publicAuthUserIds, ...privateAuthUserIds] } },
                { notificationCode: /^NTF-DEMO-/ },
                { 'relatedEntity.code': /^GR-DEMO-/ }
            ]
        }),
        SupportTicket.deleteMany({
            $or: [
                { authUserId: { $in: publicAuthUserIds } },
                { ticketCode: /^SUP-DEMO-/ },
                { 'relatedEntity.code': /^DSP-DEMO-/ }
            ]
        })
    ]);

    return {
        fares: fares.deletedCount || 0,
        rides: rides.deletedCount || 0,
        payments: payments.deletedCount || 0,
        disputes: disputes.deletedCount || 0,
        fraudCases: fraudCases.deletedCount || 0,
        notifications: notifications.deletedCount || 0,
        supportTickets: supportTickets.deletedCount || 0
    };
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

async function upsertDemoRides({ rider, privateUsers, now }) {
    const opsUser = privateUsers.find((user) => user.role === PRIVATE_AUTH_ROLES.OPS)
        || privateUsers.find((user) => user.role === PRIVATE_AUTH_ROLES.ADMIN);
    const rides = [];

    for (const seed of demoRideSeeds) {
        const driver = findDriverSeed(seed.driverId);
        const pickup = toKnownLocationSnapshot(seed.pickupId);
        const dropoff = toKnownLocationSnapshot(seed.dropoffId);
        const requestedAt = addMinutes(now, -seed.requestedMinutesAgo);
        const validUntil = addMinutes(now, seed.expiresMinutesFromNow);
        const lockedUntil = seed.status === RIDE_BOOKING_STATUSES.DRIVER_SELECTED
            ? addMinutes(now, seed.expiresMinutesFromNow)
            : addMinutes(requestedAt, 5);
        const fareEstimate = await upsertFareEstimate({
            rider,
            seed,
            pickup,
            dropoff,
            requestedAt,
            validUntil,
            lockedUntil
        });
        const fareSnapshot = toFareSnapshot(fareEstimate);
        const ride = await RideBooking.findOneAndUpdate(
            { bookingCode: seed.bookingCode },
            {
                $set: buildRidePayload({
                    rider,
                    seed,
                    pickup,
                    dropoff,
                    driver,
                    fareEstimate,
                    fareSnapshot,
                    requestedAt,
                    validUntil,
                    lockedUntil,
                    opsUser,
                    now
                }),
                $setOnInsert: {
                    createdAt: requestedAt
                }
            },
            {
                upsert: true,
                returnDocument: 'after',
                setDefaultsOnInsert: true,
                timestamps: true
            }
        );

        rides.push({
            ride,
            seed,
            driver,
            fareEstimate
        });
    }

    return rides;
}

async function upsertFareEstimate({
    rider,
    seed,
    pickup,
    dropoff,
    requestedAt,
    validUntil,
    lockedUntil
}) {
    const breakdown = buildFareBreakdown(seed);
    const payload = {
        authUserId: rider._id,
        role: rider.role,
        pickup,
        dropoff,
        vehicleType: seed.vehicleType,
        requestedAt,
        distanceKm: seed.distanceKm,
        durationMinutes: seed.durationMinutes,
        breakdown,
        surge: {
            multiplier: seed.surgeMultiplier,
            level: seed.surgeMultiplier > 1.3 ? FARE_SURGE_LEVELS.HIGH : seed.surgeMultiplier > 1 ? FARE_SURGE_LEVELS.MODERATE : FARE_SURGE_LEVELS.NORMAL,
            reason: seed.surgeMultiplier > 1
                ? 'Seeded demo demand signal for transparent surge explanation'
                : 'Normal demand in the selected area'
        },
        confidence: {
            score: seed.confidenceScore,
            level: seed.confidenceScore >= 85 ? FARE_CONFIDENCE_LEVELS.HIGH : FARE_CONFIDENCE_LEVELS.MEDIUM,
            factors: [
                'Known pickup and dropoff coordinates',
                'Seeded driver availability for repeatable demos',
                'Stable route distance and duration inputs'
            ]
        },
        alternativePickups: [
            {
                label: 'Nearby low-surge pickup',
                pickup: {
                    address: `${pickup.address} alternate stand`,
                    latitude: roundCoordinate(pickup.latitude + 0.001),
                    longitude: roundCoordinate(pickup.longitude + 0.001)
                },
                walkingDistanceMeters: 180,
                estimatedSavings: Math.max(12, Math.round(breakdown.surgeFare * 0.6)),
                estimatedFare: Math.max(35, breakdown.totalFare - Math.max(12, Math.round(breakdown.surgeFare * 0.6))),
                reason: 'Walking to this point can avoid part of the demo surge band'
            }
        ],
        validUntil,
        lock: {
            isLocked: true,
            lockedUntil
        }
    };

    return FareEstimate.findOneAndUpdate(
        {
            authUserId: rider._id,
            role: rider.role,
            vehicleType: seed.vehicleType,
            'pickup.address': pickup.address,
            'dropoff.address': dropoff.address
        },
        {
            $set: payload,
            $setOnInsert: {
                createdAt: requestedAt
            }
        },
        {
            upsert: true,
            returnDocument: 'after',
            setDefaultsOnInsert: true,
            timestamps: true
        }
    );
}

function buildRidePayload({
    rider,
    seed,
    pickup,
    dropoff,
    driver,
    fareEstimate,
    fareSnapshot,
    requestedAt,
    validUntil,
    lockedUntil,
    opsUser,
    now
}) {
    const lifecycle = buildSeedLifecycle(seed, driver, requestedAt, now);

    return {
        authUserId: rider._id,
        role: rider.role,
        fareEstimateId: fareEstimate._id,
        status: seed.status,
        pickup,
        dropoff,
        vehicleType: seed.vehicleType,
        selectedDriver: toDriverSnapshot(driver),
        fareSnapshot: {
            ...fareSnapshot,
            validUntil,
            lockedUntil
        },
        trustSignals: toTrustSignals(driver, seed.confidenceScore),
        paymentMethod: PAYMENT_METHODS.PERSONAL_WALLET,
        riderNote: seed.status === RIDE_BOOKING_STATUSES.DRIVER_SELECTED
            ? 'Seeded demo request awaiting driver action'
            : 'Seeded completed ride for history and ops demo',
        expiresAt: validUntil,
        confirmedAt: seed.status === RIDE_BOOKING_STATUSES.CONFIRMED
            ? addMinutes(requestedAt, 2)
            : null,
        cancellation: null,
        ops: buildSeedRideOps(seed.ops, opsUser, now),
        lifecycle,
        tracking: buildSeedTracking(seed, pickup, dropoff, driver, now)
    };
}

async function upsertDemoPayments({ rider, demoRides, now }) {
    const completedRides = demoRides.filter(({ seed }) => seed.lifecycleStage === 'completed');
    const payments = [];

    for (const { ride, seed, driver } of completedRides) {
        const isDisputeRide = seed.bookingCode.includes('DISPUTE');
        const capturedAt = addMinutes(now, -(seed.completedMinutesAgo || 60) + 2);
        const amount = ride.fareSnapshot.totalFare;
        const payload = {
            paymentCode: `PAY-${seed.bookingCode}`,
            authUserId: rider._id,
            role: rider.role,
            rideId: ride._id,
            rideSnapshot: toRideSnapshot(ride),
            method: isDisputeRide ? PAYMENT_METHODS.UPI : PAYMENT_METHODS.PERSONAL_WALLET,
            status: isDisputeRide ? PAYMENT_STATUSES.REFUND_REQUESTED : PAYMENT_STATUSES.SUCCEEDED,
            currency: FARE_CURRENCY,
            fareAmount: amount,
            tipAmount: isDisputeRide ? 0 : 10,
            discountAmount: 0,
            amount: amount + (isDisputeRide ? 0 : 10),
            walletBalanceBefore: 1500,
            walletBalanceAfter: Math.max(0, 1500 - amount),
            gatewayReference: `GW-${seed.bookingCode}`,
            gateway: {
                provider: PAYMENT_GATEWAY_PROVIDERS.MOCK,
                status: isDisputeRide ? PAYMENT_GATEWAY_STATUSES.REFUND_REQUESTED : PAYMENT_GATEWAY_STATUSES.SUCCEEDED,
                orderId: `ORDER-${seed.bookingCode}`,
                paymentId: `MOCK-${seed.bookingCode}`,
                rawStatus: isDisputeRide ? 'refund_requested' : 'captured',
                lastEventAt: capturedAt
            },
            idempotencyKey: `seed-${seed.bookingCode}`,
            capturedAt,
            refundableUntil: addDays(capturedAt, 7),
            refund: isDisputeRide
                ? {
                    reason: 'overcharged',
                    note: 'Seeded refund request linked to fare transparency dispute',
                    amount: 120,
                    requestedAt: addMinutes(capturedAt, 30),
                    gatewayProvider: PAYMENT_GATEWAY_PROVIDERS.MOCK,
                    gatewayStatus: PAYMENT_GATEWAY_STATUSES.REFUND_REQUESTED
                }
                : null,
            failureReason: null
        };
        const payment = await Payment.findOneAndUpdate(
            { paymentCode: payload.paymentCode },
            { $set: payload },
            {
                upsert: true,
                returnDocument: 'after',
                setDefaultsOnInsert: true,
                timestamps: true
            }
        );

        payments.push({
            payment,
            ride,
            seed,
            driver
        });
    }

    return payments;
}

async function upsertDemoDisputes({ rider, privateUsers, demoRides, now }) {
    const opsUser = privateUsers.find((user) => user.role === PRIVATE_AUTH_ROLES.OPS)
        || privateUsers.find((user) => user.role === PRIVATE_AUTH_ROLES.ADMIN);
    const disputeRide = demoRides.find(({ seed }) => seed.bookingCode.includes('DISPUTE'));

    if (!disputeRide) {
        return [];
    }

    const submittedAt = addMinutes(now, -90);
    const payload = {
        disputeCode: 'DSP-DEMO-FARE-001',
        authUserId: rider._id,
        role: rider.role,
        rideId: disputeRide.ride._id,
        rideSnapshot: toRideSnapshot(disputeRide.ride),
        type: DISPUTE_TYPES.FARE_OVERCHARGE,
        reason: DISPUTE_REASONS.FARE_HIGHER_THAN_QUOTE,
        status: DISPUTE_STATUSES.UNDER_REVIEW,
        priority: DISPUTE_PRIORITIES.HIGH,
        title: 'Fare was higher than the expected range',
        description: 'Seeded dispute showing a rider asking ops to review surge, distance, and fare-lock evidence.',
        requestedResolution: DISPUTE_REQUESTED_RESOLUTIONS.FARE_ADJUSTMENT,
        requestedRefundAmount: 120,
        evidence: [
            {
                type: DISPUTE_EVIDENCE_TYPES.RECEIPT,
                label: 'Fare receipt',
                url: 'https://goodrapido.test/demo-evidence/fare-receipt.pdf',
                note: 'Receipt shows demand surge and tax lines',
                submittedAt,
                capturedAt: addMinutes(submittedAt, -5)
            },
            {
                type: DISPUTE_EVIDENCE_TYPES.LOCATION_SNAPSHOT,
                label: 'Route snapshot',
                url: 'https://goodrapido.test/demo-evidence/route-snapshot.png',
                note: 'Route and detour evidence for ops review',
                submittedAt,
                capturedAt: addMinutes(submittedAt, -8)
            }
        ],
        timeline: {
            submittedAt,
            acknowledgedAt: addMinutes(submittedAt, 10),
            evidenceRequestedAt: addMinutes(submittedAt, 35)
        },
        resolution: null,
        trustSignals: {
            driverTrustScore: disputeRide.ride.trustSignals.driverTrustScore,
            routeAccuracyScore: disputeRide.ride.trustSignals.routeAccuracyScore,
            fairPriceScore: disputeRide.ride.trustSignals.fairPriceScore,
            cancellationRiskLevel: disputeRide.ride.trustSignals.cancellationRiskLevel
        },
        ops: {
            assignedOpsUserId: opsUser?._id || null,
            lastAction: 'evidence_requested',
            lastActionNote: 'Seeded ops note: verify fare lock, surge band, and route distance.',
            lastActionAt: addMinutes(submittedAt, 35),
            lastActionBy: opsUser?._id || null,
            actionLog: [{
                action: 'evidence_requested',
                note: 'Seeded dispute is ready for ops evidence review',
                actorId: opsUser?._id || null,
                actorRole: opsUser?.role || PRIVATE_AUTH_ROLES.OPS,
                createdAt: addMinutes(submittedAt, 35)
            }]
        },
        latestActivityAt: addMinutes(submittedAt, 35)
    };
    const dispute = await Dispute.findOneAndUpdate(
        { disputeCode: payload.disputeCode },
        { $set: payload },
        {
            upsert: true,
            returnDocument: 'after',
            setDefaultsOnInsert: true,
            timestamps: true
        }
    );

    return [dispute];
}

async function upsertDemoFraudCases({ rider, privateUsers, demoRides, payments, now }) {
    const adminUser = privateUsers.find((user) => user.role === PRIVATE_AUTH_ROLES.ADMIN);
    const opsUser = privateUsers.find((user) => user.role === PRIVATE_AUTH_ROLES.OPS) || adminUser;
    const disputeRide = demoRides.find(({ seed }) => seed.bookingCode.includes('DISPUTE'));
    const disputePayment = payments.find(({ seed }) => seed.bookingCode.includes('DISPUTE'));

    if (!disputeRide) {
        return [];
    }

    const openedAt = addMinutes(now, -70);
    const payload = {
        caseCode: 'FRD-DEMO-RIDE-001',
        subjectType: FRAUD_SUBJECT_TYPES.RIDE,
        subjectId: disputeRide.ride.bookingCode,
        subjectLabel: `${disputeRide.ride.pickup.address} to ${disputeRide.ride.dropoff.address}`,
        caseType: FRAUD_CASE_TYPES.SUSPICIOUS_RIDE,
        source: FRAUD_CASE_SOURCES.RIDE_OPS,
        severity: FRAUD_SEVERITY_LEVELS.HIGH,
        status: FRAUD_CASE_STATUSES.UNDER_REVIEW,
        riskScore: 72,
        confidenceScore: 84,
        signals: {
            promoAbuseScore: 14,
            paymentRiskScore: 46,
            gpsMismatchScore: 68,
            deviceReuseScore: 22,
            cancellationAbuseScore: 18,
            disputePatternScore: 63,
            velocityScore: 31
        },
        evidence: [
            {
                type: FRAUD_EVIDENCE_TYPES.RIDE,
                label: 'Ride timeline',
                note: 'Seeded ride has fare dispute and GPS review signals',
                capturedAt: openedAt
            },
            {
                type: FRAUD_EVIDENCE_TYPES.PAYMENT,
                label: 'Payment review',
                note: 'Refund request is linked for ops fraud-dispute correlation',
                capturedAt: addMinutes(openedAt, 10)
            }
        ],
        linkedEntities: {
            rideId: disputeRide.ride.bookingCode,
            paymentId: disputePayment?.payment.paymentCode || null,
            promoCode: null,
            deviceId: 'demo-device-rider-001',
            ipAddress: '127.0.0.1'
        },
        actions: {
            accountBlocked: false,
            payoutHeld: true,
            promoDisabled: false,
            rideBookingBlocked: false,
            reason: 'Seeded review case for suspicious ride and payment dispute demo',
            expiresAt: addDays(now, 2)
        },
        assignedReviewerId: opsUser?._id || null,
        latestReviewNote: 'Seeded fraud case: verify route evidence before confirming fraud.',
        lastReviewedAt: openedAt,
        lastReviewedBy: opsUser?._id || null,
        resolution: {},
        actionLog: [{
            action: FRAUD_ACTION_TYPES.CREATE_CASE,
            note: 'Seeded fraud case created for ops demo',
            actorId: adminUser?._id || null,
            actorRole: adminUser?.role || PRIVATE_AUTH_ROLES.ADMIN,
            createdAt: openedAt
        }],
        createdBy: adminUser?._id || null,
        updatedBy: opsUser?._id || adminUser?._id || null
    };
    const fraudCase = await FraudCase.findOneAndUpdate(
        { caseCode: payload.caseCode },
        { $set: payload },
        {
            upsert: true,
            returnDocument: 'after',
            setDefaultsOnInsert: true,
            timestamps: true
        }
    );

    return [fraudCase];
}

async function upsertDemoNotifications({
    rider,
    privateUsers,
    drivers,
    demoRides,
    payments,
    disputes,
    now
}) {
    const opsUser = privateUsers.find((user) => user.role === PRIVATE_AUTH_ROLES.OPS);
    const adminUser = privateUsers.find((user) => user.role === PRIVATE_AUTH_ROLES.ADMIN);
    const arjun = drivers.find(({ profile }) => profile.driverCode === 'DRV-BIKE-ARJUN');
    const pendingRide = demoRides.find(({ seed }) => seed.lifecycleStage === 'pending_confirmation');
    const completedRide = demoRides.find(({ seed }) => seed.lifecycleStage === 'completed' && !seed.bookingCode.includes('DISPUTE'));
    const payment = payments.find(({ seed }) => seed.bookingCode === completedRide?.seed.bookingCode);
    const dispute = disputes[0];
    const notificationSeeds = [
        {
            notificationCode: 'NTF-DEMO-RIDER-REQUEST',
            authUserId: rider._id,
            role: rider.role,
            type: NOTIFICATION_TYPES.RIDE_ALERT,
            category: NOTIFICATION_CATEGORIES.RIDES,
            priority: NOTIFICATION_PRIORITIES.HIGH,
            status: NOTIFICATION_STATUSES.UNREAD,
            title: 'Arjun Singh has your ride request',
            message: 'Your Muri to Silli booking is locked and waiting for driver action.',
            actionLabel: 'Track ride',
            actionUrl: '/ride',
            relatedEntity: toNotificationEntity(NOTIFICATION_ENTITY_TYPES.RIDE, pendingRide?.ride),
            metadata: { source: 'seed-demo', demoStep: 'rider-booking-handoff' }
        },
        {
            notificationCode: 'NTF-DEMO-RIDER-PAYMENT',
            authUserId: rider._id,
            role: rider.role,
            type: NOTIFICATION_TYPES.PAYMENT_UPDATE,
            category: NOTIFICATION_CATEGORIES.PAYMENTS,
            priority: NOTIFICATION_PRIORITIES.MEDIUM,
            status: NOTIFICATION_STATUSES.READ,
            title: 'Payment captured for completed demo ride',
            message: 'Your wallet payment was captured and receipt transparency is ready.',
            actionLabel: 'Open history',
            actionUrl: '/history',
            relatedEntity: toNotificationEntity(NOTIFICATION_ENTITY_TYPES.PAYMENT, payment?.payment),
            metadata: { source: 'seed-demo', demoStep: 'payment-history' }
        },
        {
            notificationCode: 'NTF-DEMO-DRIVER-REQUEST',
            authUserId: arjun?.authUser._id,
            role: PRIVATE_AUTH_ROLES.DRIVER,
            type: NOTIFICATION_TYPES.RIDE_ALERT,
            category: NOTIFICATION_CATEGORIES.RIDES,
            priority: NOTIFICATION_PRIORITIES.HIGH,
            status: NOTIFICATION_STATUSES.UNREAD,
            title: 'New Muri to Silli request',
            message: 'Review pickup effort, payout, rider trust, and fare confidence before accepting.',
            actionLabel: 'Open requests',
            actionUrl: '/requests',
            relatedEntity: toNotificationEntity(NOTIFICATION_ENTITY_TYPES.RIDE, pendingRide?.ride),
            metadata: { source: 'seed-demo', demoStep: 'driver-request' }
        },
        {
            notificationCode: 'NTF-DEMO-OPS-DISPUTE',
            authUserId: opsUser?._id || adminUser?._id,
            role: opsUser?.role || adminUser?.role || PRIVATE_AUTH_ROLES.OPS,
            type: NOTIFICATION_TYPES.DISPUTE_UPDATE,
            category: NOTIFICATION_CATEGORIES.DISPUTES,
            priority: NOTIFICATION_PRIORITIES.URGENT,
            status: NOTIFICATION_STATUSES.UNREAD,
            title: 'Fare dispute needs ops review',
            message: 'A seeded fare dispute is ready with receipt and route evidence.',
            actionLabel: 'Open disputes',
            actionUrl: '/fraud-disputes',
            relatedEntity: toNotificationEntity(NOTIFICATION_ENTITY_TYPES.DISPUTE, dispute),
            metadata: { source: 'seed-demo', demoStep: 'ops-fraud-dispute' }
        }
    ].filter((seed) => seed.authUserId);
    const notifications = [];

    for (const seed of notificationSeeds) {
        const sentAt = addMinutes(now, -20);
        const notification = await Notification.findOneAndUpdate(
            { notificationCode: seed.notificationCode },
            {
                $set: {
                    ...seed,
                    channel: NOTIFICATION_CHANNELS.IN_APP,
                    delivery: {
                        sentAt,
                        readAt: seed.status === NOTIFICATION_STATUSES.READ ? addMinutes(sentAt, 5) : null
                    },
                    expiresAt: addDays(now, 7)
                }
            },
            {
                upsert: true,
                returnDocument: 'after',
                setDefaultsOnInsert: true,
                timestamps: true
            }
        );

        notifications.push(notification);
    }

    return notifications;
}

async function upsertDemoSupportTickets({ rider, demoRides, disputes, now }) {
    const disputeRide = demoRides.find(({ seed }) => seed.bookingCode.includes('DISPUTE'));
    const dispute = disputes[0];

    if (!disputeRide) {
        return [];
    }

    const openedAt = addMinutes(now, -85);
    const payload = {
        ticketCode: 'SUP-DEMO-FARE-001',
        authUserId: rider._id,
        role: rider.role,
        category: SUPPORT_CATEGORIES.FARE_PAYMENT,
        status: SUPPORT_STATUSES.WAITING_FOR_SUPPORT,
        priority: SUPPORT_PRIORITIES.HIGH,
        channel: SUPPORT_CHANNELS.IN_APP,
        contactMethod: SUPPORT_CONTACT_METHODS.IN_APP,
        subject: 'Fare and refund review',
        description: 'Seeded support ticket connected to the fare overcharge dispute and refund review flow.',
        relatedEntity: {
            type: SUPPORT_ENTITY_TYPES.DISPUTE,
            id: dispute?._id?.toString() || null,
            code: dispute?.disputeCode || 'DSP-DEMO-FARE-001'
        },
        contact: {
            name: rider.fullName,
            email: rider.email,
            phone: rider.phone,
            preferredContactMethod: SUPPORT_CONTACT_METHODS.IN_APP,
            preferredContactWindow: 'Anytime during demo'
        },
        attachments: [{
            type: SUPPORT_ATTACHMENT_TYPES.RECEIPT,
            label: 'Fare receipt',
            url: 'https://goodrapido.test/demo-evidence/fare-receipt.pdf',
            note: 'Seeded receipt for support review',
            submittedAt: openedAt,
            capturedAt: addMinutes(openedAt, -5)
        }],
        messages: [
            {
                sender: SUPPORT_MESSAGE_SENDERS.USER,
                message: 'Please review why my fare went above the expected range.',
                attachments: [],
                createdAt: openedAt
            },
            {
                sender: SUPPORT_MESSAGE_SENDERS.SYSTEM,
                message: 'Ticket linked to fare dispute and routed to ops review.',
                attachments: [],
                createdAt: addMinutes(openedAt, 2)
            }
        ],
        timeline: {
            openedAt,
            firstResponseDueAt: addHours(openedAt, 12),
            lastUserMessageAt: openedAt,
            lastSupportMessageAt: null
        },
        latestActivityAt: addMinutes(openedAt, 2),
        metadata: {
            source: 'seed-demo',
            rideCode: disputeRide.ride.bookingCode
        }
    };
    const supportTicket = await SupportTicket.findOneAndUpdate(
        { ticketCode: payload.ticketCode },
        { $set: payload },
        {
            upsert: true,
            returnDocument: 'after',
            setDefaultsOnInsert: true,
            timestamps: true
        }
    );

    return [supportTicket];
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

function toDriverLocation(driver, index) {
    if (driver.id === 'drv_bike_arjun') {
        return { address: 'Muri driver stand', latitude: 23.3813, longitude: 85.8634 };
    }

    if (driver.id === 'drv_auto_imran') {
        return { address: 'Silli driver stand', latitude: 23.3542, longitude: 85.8292 };
    }

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

function findDriverSeed(driverId) {
    const driver = RIDE_BOOKING_DRIVER_POOL.find((item) => item.id === driverId);

    if (!driver) {
        throw new Error(`Unknown demo driver id: ${driverId}`);
    }

    return driver;
}

function toKnownLocationSnapshot(locationId) {
    const location = knownLocationMap.get(locationId);

    if (!location) {
        throw new Error(`Unknown demo location id: ${locationId}`);
    }

    return {
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude
    };
}

function buildFareBreakdown(seed) {
    const pricing = FARE_VEHICLE_PRICING[seed.vehicleType] || FARE_VEHICLE_PRICING[FARE_VEHICLE_TYPES.BIKE];
    const baseFare = roundCurrency(pricing.baseFare);
    const distanceFare = roundCurrency(seed.distanceKm * pricing.perKm);
    const timeFare = roundCurrency(seed.durationMinutes * pricing.perMinute);
    const platformFee = roundCurrency(pricing.platformFee);
    const surgeBase = baseFare + distanceFare + timeFare;
    const surgeFare = roundCurrency(Math.max(0, surgeBase * (seed.surgeMultiplier - 1)));
    const subtotal = baseFare + distanceFare + timeFare + surgeFare + platformFee;
    const taxes = roundCurrency(Math.max(0, seed.totalFare - subtotal));

    return {
        currency: FARE_CURRENCY,
        baseFare,
        distanceFare,
        timeFare,
        minFareAdjustment: 0,
        surgeFare,
        platformFee,
        taxes,
        totalFare: roundCurrency(seed.totalFare || subtotal + taxes)
    };
}

const toFareSnapshot = (fareEstimate) => ({
    currency: fareEstimate.breakdown.currency,
    totalFare: fareEstimate.breakdown.totalFare,
    distanceKm: fareEstimate.distanceKm,
    durationMinutes: fareEstimate.durationMinutes,
    surgeMultiplier: fareEstimate.surge.multiplier,
    confidenceScore: fareEstimate.confidence.score,
    validUntil: fareEstimate.validUntil,
    lockedUntil: fareEstimate.lock?.lockedUntil || null
});

const toDriverSnapshot = (driver) => ({
    driverId: driver.id,
    fullName: driver.fullName,
    rating: driver.rating,
    vehicleName: driver.vehicleName,
    vehicleNumber: driver.vehicleNumber,
    vehicleColor: driver.vehicleColor,
    etaMinutes: driver.etaMinutes,
    distanceKm: driver.distanceKm
});

const toTrustSignals = (driver, fairPriceScore) => ({
    driverTrustScore: driver.trustScore,
    driverReliabilityScore: driver.reliabilityScore,
    routeFairnessScore: driver.routeFairnessScore,
    routeAccuracyScore: Math.max(85, Math.round(driver.routeFairnessScore - driver.detourPercentage)),
    cancellationRiskScore: driver.cancellationRiskScore,
    cancellationRiskLevel: driver.cancellationRiskLevel || RIDE_BOOKING_RISK_LEVELS.LOW,
    cancellationRatio: driver.cancellationRatio,
    detourPercentage: driver.detourPercentage,
    onTimeArrivalScore: driver.onTimeArrivalScore,
    fairPriceScore
});

function buildSeedRideOps(seedOps = {}, opsUser, now) {
    const actionCreatedAt = addMinutes(now, -15);

    return {
        priority: seedOps.priority || 'normal',
        issueStatus: seedOps.issueStatus || 'none',
        assignedOpsUserId: opsUser?._id || null,
        lastAction: seedOps.lastAction || 'demo_seeded',
        lastActionNote: seedOps.lastActionNote || 'Seeded demo ride record',
        lastActionAt: actionCreatedAt,
        lastActionBy: opsUser?._id || null,
        actionLog: [{
            action: seedOps.lastAction || 'demo_seeded',
            note: seedOps.lastActionNote || 'Seeded demo ride record',
            actorId: opsUser?._id || null,
            actorRole: opsUser?.role || PRIVATE_AUTH_ROLES.OPS,
            createdAt: actionCreatedAt
        }]
    };
}

function buildSeedLifecycle(seed, driver, requestedAt, now) {
    if (seed.lifecycleStage !== 'completed') {
        return {};
    }

    const completedAt = addMinutes(now, -(seed.completedMinutesAgo || 60));
    const driverArrivedAt = addMinutes(requestedAt, driver.etaMinutes + 3);
    const rideStartedAt = addMinutes(driverArrivedAt, 2);

    return {
        driverArrivedAt,
        rideStartedAt,
        completedAt,
        lastTransition: RIDE_LIFECYCLE_EVENTS.RIDE_COMPLETED,
        lastTransitionAt: completedAt,
        lastTransitionBy: driver.id,
        transitionLog: [
            {
                event: RIDE_LIFECYCLE_EVENTS.DRIVER_ARRIVED,
                note: 'Seeded driver arrival for demo ride',
                actorId: driver.id,
                actorRole: PRIVATE_AUTH_ROLES.DRIVER,
                occurredAt: driverArrivedAt,
                createdAt: driverArrivedAt
            },
            {
                event: RIDE_LIFECYCLE_EVENTS.RIDE_STARTED,
                note: 'Seeded ride start for demo ride',
                actorId: driver.id,
                actorRole: PRIVATE_AUTH_ROLES.DRIVER,
                occurredAt: rideStartedAt,
                createdAt: rideStartedAt
            },
            {
                event: RIDE_LIFECYCLE_EVENTS.RIDE_COMPLETED,
                note: 'Seeded ride completion for demo ride',
                actorId: driver.id,
                actorRole: PRIVATE_AUTH_ROLES.DRIVER,
                occurredAt: completedAt,
                createdAt: completedAt
            }
        ]
    };
}

function buildSeedTracking(seed, pickup, dropoff, driver, now) {
    if (seed.lifecycleStage !== 'completed') {
        return {};
    }

    const capturedAt = addMinutes(now, -(seed.completedMinutesAgo || 60));
    const midpoint = {
        latitude: roundCoordinate((pickup.latitude + dropoff.latitude) / 2),
        longitude: roundCoordinate((pickup.longitude + dropoff.longitude) / 2)
    };
    const path = [
        toTrackingPoint(pickup, capturedAt, 36),
        toTrackingPoint(midpoint, addMinutes(capturedAt, 8), 28),
        toTrackingPoint(dropoff, addMinutes(capturedAt, 16), 0)
    ];

    return {
        lastDriverLocation: {
            ...toTrackingPoint(dropoff, addMinutes(capturedAt, 16), 0),
            headingDegrees: 90,
            source: 'gps'
        },
        path,
        updatedAt: addMinutes(capturedAt, 16)
    };
}

const toTrackingPoint = (location, capturedAt, speedKmph) => ({
    latitude: location.latitude,
    longitude: location.longitude,
    accuracyMeters: 18,
    headingDegrees: 90,
    speedKmph,
    source: 'gps',
    capturedAt,
    receivedAt: capturedAt
});

function toRideSnapshot(ride) {
    const rideObject = ride.toObject ? ride.toObject() : ride;

    return {
        bookingCode: rideObject.bookingCode,
        pickup: rideObject.pickup,
        dropoff: rideObject.dropoff,
        vehicleType: rideObject.vehicleType,
        driver: {
            driverId: rideObject.selectedDriver?.driverId,
            fullName: rideObject.selectedDriver?.fullName,
            vehicleName: rideObject.selectedDriver?.vehicleName,
            vehicleNumber: rideObject.selectedDriver?.vehicleNumber
        }
    };
}

function toNotificationEntity(type, entity) {
    if (!entity) {
        return {
            type,
            id: null,
            code: null
        };
    }

    return {
        type,
        id: entity._id?.toString?.() || entity.id || null,
        code: entity.bookingCode || entity.paymentCode || entity.disputeCode || entity.notificationCode || null
    };
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

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

const addHours = (date, hours) => new Date(date.getTime() + hours * 60 * 60 * 1000);

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const roundCurrency = (value) => Math.round((Number(value) || 0) * 100) / 100;

const roundCoordinate = (value) => Math.round((Number(value) || 0) * 1000000) / 1000000;

const printSummary = ({
    publicUsers,
    privateUsers,
    drivers,
    demoRides,
    payments,
    disputes,
    fraudCases,
    notifications,
    supportTickets,
    cleanup
}) => {
    console.log('Good Rapido demo data seeded.');
    console.log(`Password: ${seedPassword}`);
    console.log(`Password reset mode: ${shouldResetPasswords ? 'enabled' : 'disabled for existing users'}`);
    console.log('');
    console.log('Known location resolver');
    KNOWN_LOCATIONS.forEach((location) => console.log(`- ${location.address} (${location.context})`));
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
    console.log('');
    console.log('Demo rides');
    demoRides.forEach(({ ride }) => {
        console.log(`- ${ride.bookingCode}: ${ride.pickup.address} -> ${ride.dropoff.address} (${ride.status})`);
    });
    console.log('');
    console.log('Seeded operational records');
    console.log(`- Payments: ${payments.length}`);
    console.log(`- Disputes: ${disputes.length}`);
    console.log(`- Fraud cases: ${fraudCases.length}`);
    console.log(`- Notifications: ${notifications.length}`);
    console.log(`- Support tickets: ${supportTickets.length}`);
    console.log('');
    console.log('Cleaned previous demo operational records');
    console.log(`- Fare estimates: ${cleanup.fares}`);
    console.log(`- Rides: ${cleanup.rides}`);
    console.log(`- Payments: ${cleanup.payments}`);
    console.log(`- Disputes: ${cleanup.disputes}`);
    console.log(`- Fraud cases: ${cleanup.fraudCases}`);
    console.log(`- Notifications: ${cleanup.notifications}`);
    console.log(`- Support tickets: ${cleanup.supportTickets}`);
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
