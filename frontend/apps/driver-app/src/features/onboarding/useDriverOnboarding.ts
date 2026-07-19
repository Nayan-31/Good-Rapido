import { useCallback, useEffect, useState } from "react";

import { ApiClientError } from "@good-rapido/api-client";
import { driverOnboardingService } from "./onboarding.service";
import type {
  DriverDocumentForm,
  DriverOnboardingWorkspace,
  DriverProfileForm,
  DriverVehicleForm
} from "./onboarding.types";

const defaultProfileForm: DriverProfileForm = {
  displayName: "Amit Das",
  bio: "Safe, punctual, and transparent rides across Kolkata.",
  profilePhotoUrl: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c",
  languages: "Hindi, English, Bengali",
  serviceZone: "kolkata",
  vehicleType: "cab_economy",
  experienceYears: "4",
  preferredRadiusKm: "8"
};

const defaultDocumentForm: DriverDocumentForm = {
  documentType: "driving_license",
  documentNumber: "DL-KA-2026-0182",
  holderName: "Amit Das",
  fileUrl: "https://example.com/uploads/driving-license-front.jpg",
  backFileUrl: "",
  issuedAt: "2022-01-10",
  expiresAt: "2032-01-10",
  notes: "Clear scanned document uploaded by driver."
};

const defaultVehicleForm: DriverVehicleForm = {
  type: "cab_economy",
  make: "Maruti Suzuki",
  model: "Dzire",
  color: "White",
  registrationNumber: "WB 04 AB 1234",
  manufacturingYear: "2022",
  ownershipType: "owned",
  fuelType: "cng",
  insuranceNumber: "INS-WB-2026-8912",
  insuranceExpiresAt: "2027-07-18",
  notes: "Commercial permit ready for Kolkata zone."
};

export function useDriverOnboarding() {
  const [workspace, setWorkspace] = useState<DriverOnboardingWorkspace | null>(null);
  const [profileForm, setProfileForm] = useState(defaultProfileForm);
  const [documentForm, setDocumentForm] = useState(defaultDocumentForm);
  const [vehicleForm, setVehicleForm] = useState(defaultVehicleForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextWorkspace = await driverOnboardingService.loadWorkspace();
      setWorkspace(nextWorkspace);
      setProfileForm((current) => hydrateProfileForm(current, nextWorkspace));
    } catch (loadError) {
      setError(resolveError(loadError, "Unable to load driver onboarding"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = useCallback(async (action: () => Promise<string>) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const nextMessage = await action();
      setMessage(nextMessage);
      await load();
    } catch (actionError) {
      setError(resolveError(actionError, "Driver onboarding action failed"));
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  const saveProfile = () => runAction(async () => {
    const response = await driverOnboardingService.updateProfile(profileForm);
    await driverOnboardingService.updateSteps(["profile", "service_zone", "vehicle_preference"]);
    return response.message || "Driver profile saved";
  });

  const uploadDocument = () => runAction(async () => {
    const response = await driverOnboardingService.upsertDocument(documentForm);
    return response.message || "Driver document uploaded";
  });

  const submitDocuments = () => runAction(async () => {
    const response = await driverOnboardingService.submitDocuments();
    return response.message || "Driver documents submitted";
  });

  const saveVehicle = () => runAction(async () => {
    const response = await driverOnboardingService.createVehicle(vehicleForm);
    return response.message || "Vehicle saved";
  });

  const submitVehicle = (vehicleId: string) => runAction(async () => {
    const response = await driverOnboardingService.submitVehicle(vehicleId);
    return response.message || "Vehicle submitted";
  });

  const submitOnboarding = () => runAction(async () => {
    await driverOnboardingService.updateSteps(["bank_details", "safety_training"]);
    const response = await driverOnboardingService.submitOnboarding();
    return response.message || "Onboarding submitted";
  });

  return {
    workspace,
    profileForm,
    setProfileForm,
    documentForm,
    setDocumentForm,
    vehicleForm,
    setVehicleForm,
    message,
    error,
    isLoading,
    isSaving,
    reload: load,
    saveProfile,
    uploadDocument,
    submitDocuments,
    saveVehicle,
    submitVehicle,
    submitOnboarding
  };
}

const hydrateProfileForm = (current: DriverProfileForm, workspace: DriverOnboardingWorkspace): DriverProfileForm => {
  const profile = workspace.profile?.driver?.profile;
  const service = workspace.profile?.driver?.service;

  return {
    ...current,
    displayName: profile?.displayName ?? workspace.profile?.auth?.fullName ?? current.displayName,
    bio: profile?.bio ?? current.bio,
    profilePhotoUrl: profile?.profilePhotoUrl ?? current.profilePhotoUrl,
    languages: profile?.languages?.length ? profile.languages.join(", ") : current.languages,
    serviceZone: service?.serviceZone ?? current.serviceZone,
    vehicleType: service?.vehicleTypes?.[0] ?? current.vehicleType,
    experienceYears: service?.experienceYears?.toString() ?? current.experienceYears,
    preferredRadiusKm: service?.preferredRadiusKm?.toString() ?? current.preferredRadiusKm
  };
};

const resolveError = (error: unknown, fallback: string) => {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return fallback;
};
