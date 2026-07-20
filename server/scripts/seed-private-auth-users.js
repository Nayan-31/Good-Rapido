import mongoose from 'mongoose';

import { connectDB } from '../src/config/db.js';
import {
    DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_ROLES
} from '../src/modules/private/auth/auth.constants.js';
import PrivateAuthUser from '../src/modules/private/auth/auth.model.js';
import PasswordService from '../src/modules/private/auth/session/password.service.js';

const passwordService = new PasswordService();

const seedPassword = process.env.PRIVATE_AUTH_SEED_PASSWORD || 'Password@123';
const shouldResetPasswords = process.env.PRIVATE_AUTH_SEED_RESET_PASSWORDS === 'true';

const seedUsers = [
    {
        role: PRIVATE_AUTH_ROLES.ADMIN,
        fullName: process.env.PRIVATE_ADMIN_NAME || 'Good Rapido Admin',
        email: process.env.PRIVATE_ADMIN_EMAIL || 'admin@goodrapido.test',
        phone: process.env.PRIVATE_ADMIN_PHONE || '+919999100001',
        employeeCode: process.env.PRIVATE_ADMIN_EMPLOYEE_CODE || 'ADM-001',
        department: 'platform_admin',
        serviceZone: 'all'
    },
    {
        role: PRIVATE_AUTH_ROLES.OPS,
        fullName: process.env.PRIVATE_OPS_NAME || 'Good Rapido Ops',
        email: process.env.PRIVATE_OPS_EMAIL || 'ops@goodrapido.test',
        phone: process.env.PRIVATE_OPS_PHONE || '+919999100002',
        employeeCode: process.env.PRIVATE_OPS_EMPLOYEE_CODE || 'OPS-001',
        department: 'operations',
        serviceZone: process.env.PRIVATE_OPS_SERVICE_ZONE || 'kolkata'
    }
];

async function seedPrivateAuthUsers() {
    await connectDB();

    const passwordHash = await passwordService.hash(seedPassword);
    const results = [];

    for (const userSeed of seedUsers) {
        const normalizedSeed = normalizeSeedUser(userSeed);
        const existingUser = await PrivateAuthUser.findOne({
            role: normalizedSeed.role,
            email: normalizedSeed.email
        }).select('+passwordHash');

        if (existingUser) {
            existingUser.set({
                fullName: normalizedSeed.fullName,
                phone: normalizedSeed.phone,
                employeeCode: normalizedSeed.employeeCode,
                department: normalizedSeed.department,
                serviceZone: normalizedSeed.serviceZone,
                permissions: [...(DEFAULT_PRIVATE_ROLE_PERMISSIONS[normalizedSeed.role] || [])],
                accountStatus: PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE
            });

            if (shouldResetPasswords) {
                existingUser.passwordHash = passwordHash;
            }

            await existingUser.save();
            results.push({
                role: normalizedSeed.role,
                email: normalizedSeed.email,
                action: shouldResetPasswords ? 'updated_password_reset' : 'updated_password_kept'
            });
            continue;
        }

        await PrivateAuthUser.create({
            ...normalizedSeed,
            permissions: [...(DEFAULT_PRIVATE_ROLE_PERMISSIONS[normalizedSeed.role] || [])],
            accountStatus: PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE,
            passwordHash
        });

        results.push({
            role: normalizedSeed.role,
            email: normalizedSeed.email,
            action: 'created'
        });
    }

    return results;
}

const normalizeSeedUser = (seed) => ({
    ...seed,
    email: seed.email.trim().toLowerCase(),
    phone: seed.phone.trim(),
    employeeCode: seed.employeeCode.trim().toUpperCase()
});

seedPrivateAuthUsers()
    .then((results) => {
        results.forEach((result) => {
            console.log(`${result.role} ${result.email}: ${result.action}`);
        });
        console.log(`Seed password: ${seedPassword}`);
    })
    .catch((error) => {
        console.error('Private auth seed failed');
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
