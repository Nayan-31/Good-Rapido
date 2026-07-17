import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import { createAuthGuard } from '../auth/session/auth-guard.middleware.js';
import TokenService from '../auth/session/token.service.js';
import ProfileController from './profile.controller.js';
import ProfileDao from './profile.dao.js';
import ProfileService from './profile.service.js';
import {
    addEmergencyContactSchema,
    addSavedAddressSchema,
    emergencyContactParamsSchema,
    savedAddressParamsSchema,
    updateEmergencyContactSchema,
    updatePreferencesSchema,
    updateProfileSchema,
    updateSavedAddressSchema
} from './validators/profile.validator.js';

const createProfileDependencies = ({
    profileDao = new ProfileDao(),
    tokenService = new TokenService()
} = {}) => ({
    profileDao,
    tokenService
});

export const createProfileRouter = (dependencies = createProfileDependencies()) => {
    const router = Router();
    const { profileDao, tokenService } = dependencies;
    const profileService = new ProfileService({ dao: profileDao });
    const profileController = new ProfileController(profileService);
    const requireAuth = createAuthGuard({
        tokenService,
        allowedRoles: Object.values(AUTH_ROLES)
    });

    router.use(requireAuth);

    router.get('/me', profileController.me);
    router.patch('/me', validate(updateProfileSchema), profileController.updateMe);
    router.patch('/preferences', validate(updatePreferencesSchema), profileController.updatePreferences);

    router.post('/saved-addresses', validate(addSavedAddressSchema), profileController.addSavedAddress);
    router.patch('/saved-addresses/:addressId', validate(updateSavedAddressSchema), profileController.updateSavedAddress);
    router.delete('/saved-addresses/:addressId', validate(savedAddressParamsSchema), profileController.removeSavedAddress);

    router.post('/emergency-contacts', validate(addEmergencyContactSchema), profileController.addEmergencyContact);
    router.patch('/emergency-contacts/:contactId', validate(updateEmergencyContactSchema), profileController.updateEmergencyContact);
    router.delete('/emergency-contacts/:contactId', validate(emergencyContactParamsSchema), profileController.removeEmergencyContact);

    return router;
};

export default createProfileRouter();
