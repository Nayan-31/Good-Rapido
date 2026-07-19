import type { ApiPayload, ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type {
  DriverDocumentForm,
  DriverDocumentsState,
  DriverOnboardingState,
  DriverOnboardingWorkspace,
  DriverProfileEnvelope,
  DriverProfileForm,
  DriverVehicleForm,
  DriverVehiclesState,
  OnboardingStepKey
} from "./onboarding.types";

type ProfileResponse = ApiResponse<{ profile: DriverProfileEnvelope }>;
type OnboardingResponse = ApiResponse<{
  onboarding: DriverOnboardingState;
  approvalStatus: DriverOnboardingWorkspace["approvalStatus"];
  guidance: DriverProfileEnvelope["guidance"];
}>;
type DocumentsResponse = ApiResponse<{ documents: DriverDocumentsState }>;
type VehiclesResponse = ApiResponse<{ vehicles: DriverVehiclesState }>;

export const driverOnboardingService = {
  async loadWorkspace(): Promise<DriverOnboardingWorkspace> {
    const profileResponse = await apiClient.private.driver.getProfile() as ProfileResponse;
    const [onboardingResponse, documentsResponse, vehiclesResponse] = await Promise.all([
      apiClient.private.driver.getOnboarding() as Promise<OnboardingResponse>,
      apiClient.private.driverDocuments.getDocuments() as Promise<DocumentsResponse>,
      apiClient.private.vehicle.getVehicles() as Promise<VehiclesResponse>
    ]);

    const profile = profileResponse.data?.profile ?? null;
    const onboarding = onboardingResponse.data?.onboarding ?? profile?.driver?.onboarding ?? null;

    return {
      profile,
      onboarding,
      approvalStatus: onboardingResponse.data?.approvalStatus ?? profile?.driver?.approvalStatus ?? "pending",
      documents: documentsResponse.data?.documents ?? null,
      vehicles: vehiclesResponse.data?.vehicles ?? null,
      nextAction: onboardingResponse.data?.guidance?.nextAction ?? profile?.guidance?.nextAction ?? "Complete onboarding"
    };
  },

  updateProfile(form: DriverProfileForm) {
    return apiClient.private.driver.updateProfile(buildProfilePayload(form)) as Promise<ProfileResponse>;
  },

  updateSteps(keys: OnboardingStepKey[]) {
    return apiClient.private.driver.updateOnboarding({
      steps: keys.map((key) => ({
        key,
        status: "completed",
        completedAt: new Date().toISOString()
      }))
    }) as Promise<OnboardingResponse>;
  },

  submitOnboarding() {
    return apiClient.private.driver.submitOnboarding() as Promise<OnboardingResponse>;
  },

  upsertDocument(form: DriverDocumentForm) {
    return apiClient.private.driverDocuments.upsertDocument(
      form.documentType,
      buildDocumentPayload(form)
    ) as Promise<DocumentsResponse>;
  },

  submitDocuments() {
    return apiClient.private.driverDocuments.submitDocuments() as Promise<DocumentsResponse>;
  },

  createVehicle(form: DriverVehicleForm) {
    return apiClient.private.vehicle.createVehicle(buildVehiclePayload(form)) as Promise<VehiclesResponse>;
  },

  submitVehicle(vehicleId: string) {
    return apiClient.private.vehicle.submitVehicle(vehicleId) as Promise<VehiclesResponse>;
  }
};

const buildProfilePayload = (form: DriverProfileForm): ApiPayload => ({
  profile: {
    displayName: cleanText(form.displayName),
    bio: cleanText(form.bio),
    ...(cleanText(form.profilePhotoUrl) ? { profilePhotoUrl: cleanText(form.profilePhotoUrl) } : {}),
    languages: form.languages
      .split(",")
      .map((language) => language.trim())
      .filter(Boolean)
  },
  service: {
    serviceZone: cleanText(form.serviceZone),
    vehicleTypes: [form.vehicleType],
    experienceYears: toNumber(form.experienceYears),
    preferredRadiusKm: toNumber(form.preferredRadiusKm)
  }
});

const buildDocumentPayload = (form: DriverDocumentForm): ApiPayload => ({
  ...(cleanText(form.documentNumber) ? { documentNumber: cleanText(form.documentNumber) } : {}),
  ...(cleanText(form.holderName) ? { holderName: cleanText(form.holderName) } : {}),
  fileUrl: cleanText(form.fileUrl),
  ...(cleanText(form.backFileUrl) ? { backFileUrl: cleanText(form.backFileUrl) } : {}),
  ...(form.issuedAt ? { issuedAt: form.issuedAt } : {}),
  ...(form.expiresAt ? { expiresAt: form.expiresAt } : {}),
  ...(cleanText(form.notes) ? { notes: cleanText(form.notes) } : {})
});

const buildVehiclePayload = (form: DriverVehicleForm): ApiPayload => ({
  type: form.type,
  make: cleanText(form.make),
  model: cleanText(form.model),
  color: cleanText(form.color),
  registrationNumber: cleanText(form.registrationNumber),
  ...(toNumber(form.manufacturingYear) ? { manufacturingYear: toNumber(form.manufacturingYear) } : {}),
  ownershipType: form.ownershipType,
  fuelType: form.fuelType,
  ...(cleanText(form.insuranceNumber) || form.insuranceExpiresAt
    ? {
        insurance: {
          ...(cleanText(form.insuranceNumber) ? { number: cleanText(form.insuranceNumber) } : {}),
          ...(form.insuranceExpiresAt ? { expiresAt: form.insuranceExpiresAt } : {})
        }
      }
    : {}),
  ...(cleanText(form.notes) ? { notes: cleanText(form.notes) } : {})
});

const cleanText = (value: string) => value.trim();

const toNumber = (value: string) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
};
