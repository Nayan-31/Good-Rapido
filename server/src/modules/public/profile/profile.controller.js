import { sendHttpResponse } from '../../../shared/utils/apiResponse.js';
import asyncHandler from '../../../shared/utils/asyncHandler.js';

export default class ProfileController {
    constructor(profileService) {
        this.profileService = profileService;
    }

    me = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.profileService.me(req.auth));
    });

    updateMe = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.profileService.updateMe(req.auth, req.body));
    });

    updatePreferences = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.profileService.updatePreferences(req.auth, req.body));
    });

    addSavedAddress = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.profileService.addSavedAddress(req.auth, req.body));
    });

    updateSavedAddress = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.profileService.updateSavedAddress(req.auth, req.params.addressId, req.body));
    });

    removeSavedAddress = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.profileService.removeSavedAddress(req.auth, req.params.addressId));
    });

    addEmergencyContact = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.profileService.addEmergencyContact(req.auth, req.body));
    });

    updateEmergencyContact = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.profileService.updateEmergencyContact(req.auth, req.params.contactId, req.body));
    });

    removeEmergencyContact = asyncHandler(async (req, res) => {
        sendHttpResponse(res, await this.profileService.removeEmergencyContact(req.auth, req.params.contactId));
    });
}
