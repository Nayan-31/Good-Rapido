import type { DriverAuthUser } from "@/features/auth";

export type OnboardingStepKey =
  | "profile"
  | "service_zone"
  | "vehicle_preference"
  | "documents"
  | "bank_details"
  | "safety_training";

export type OnboardingStepStatus = "pending" | "completed" | "skipped" | "rejected";
export type DriverApprovalStatus = "pending" | "under_review" | "approved" | "rejected" | "suspended";
export type DriverOnboardingStatus = "not_started" | "in_progress" | "submitted" | "approved" | "rejected";
export type DriverVehicleType = "bike" | "auto" | "cab_economy" | "cab_premium";
export type DriverDocumentType =
  | "driving_license"
  | "identity_proof"
  | "address_proof"
  | "profile_photo"
  | "bank_proof"
  | "police_verification";

export interface DriverOnboardingStep {
  key: OnboardingStepKey;
  label: string;
  required: boolean;
  status: OnboardingStepStatus;
  note: string | null;
  completedAt: string | null;
  updatedAt: string | null;
}

export interface DriverOnboardingState {
  status: DriverOnboardingStatus;
  steps: DriverOnboardingStep[];
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  completion: {
    requiredSteps: number;
    completedRequiredSteps: number;
    percent: number;
  };
}

export interface DriverProfileEnvelope {
  auth: DriverAuthUser | null;
  driver: {
    id: string | null;
    driverCode: string | null;
    profile: {
      displayName: string | null;
      bio: string | null;
      profilePhotoUrl: string | null;
      languages: string[];
    };
    service: {
      serviceZone: string | null;
      vehicleTypes: DriverVehicleType[];
      experienceYears: number | null;
      preferredRadiusKm: number | null;
    };
    onboarding: DriverOnboardingState;
    approvalStatus: DriverApprovalStatus;
  } | null;
  guidance: {
    canEditProfile: boolean;
    canSubmitOnboarding: boolean;
    canEnableRideRequests: boolean;
    nextAction: string;
  } | null;
}

export interface DriverDocumentItem {
  type: DriverDocumentType;
  label: string;
  required: boolean;
  expires: boolean;
  status: "missing" | "uploaded" | "under_review" | "approved" | "rejected";
  documentNumber: string | null;
  holderName: string | null;
  fileUrl: string | null;
  expiresAt: string | null;
  notes: string | null;
}

export interface DriverDocumentsState {
  status: "not_started" | "in_progress" | "submitted" | "approved" | "rejected";
  documents: DriverDocumentItem[];
  completion: {
    requiredDocuments: number;
    readyRequiredDocuments: number;
    approvedRequiredDocuments: number;
    missingRequiredTypes: DriverDocumentType[];
    rejectedRequiredTypes: DriverDocumentType[];
    percent: number;
  };
  guidance: {
    canEdit: boolean;
    canSubmit: boolean;
    requiresReview: boolean;
    needsRevision: boolean;
    nextAction: string;
  };
}

export interface DriverVehicleItem {
  id: string | null;
  type: DriverVehicleType | null;
  label: string | null;
  make: string | null;
  model: string | null;
  color: string | null;
  registrationNumber: string | null;
  manufacturingYear: number | null;
  ownershipType: string | null;
  fuelType: string | null;
  status: "draft" | "submitted" | "approved" | "rejected" | "suspended";
  isPrimary: boolean;
  guidance: {
    canEdit: boolean;
    canSubmit: boolean;
    canMakePrimary: boolean;
    requiresReview: boolean;
    needsRevision: boolean;
  };
}

export interface DriverVehiclesState {
  vehicles: DriverVehicleItem[];
  summary: {
    totalVehicles: number;
    primaryVehicleId: string | null;
    approvedVehicles: number;
    submittedVehicles: number;
    rejectedVehicles: number;
    suspendedVehicles: number;
  };
  guidance: {
    canAddVehicle: boolean;
    hasApprovedPrimaryVehicle: boolean;
    nextAction: string;
  };
}

export interface DriverProfileForm {
  displayName: string;
  bio: string;
  profilePhotoUrl: string;
  languages: string;
  serviceZone: string;
  vehicleType: DriverVehicleType;
  experienceYears: string;
  preferredRadiusKm: string;
}

export interface DriverDocumentForm {
  documentType: DriverDocumentType;
  documentNumber: string;
  holderName: string;
  fileUrl: string;
  backFileUrl: string;
  issuedAt: string;
  expiresAt: string;
  notes: string;
}

export interface DriverVehicleForm {
  type: DriverVehicleType;
  make: string;
  model: string;
  color: string;
  registrationNumber: string;
  manufacturingYear: string;
  ownershipType: "owned" | "rented" | "leased" | "company";
  fuelType: "petrol" | "diesel" | "cng" | "electric" | "hybrid" | "not_applicable";
  insuranceNumber: string;
  insuranceExpiresAt: string;
  notes: string;
}

export interface DriverOnboardingWorkspace {
  profile: DriverProfileEnvelope | null;
  onboarding: DriverOnboardingState | null;
  approvalStatus: DriverApprovalStatus;
  documents: DriverDocumentsState | null;
  vehicles: DriverVehiclesState | null;
  nextAction: string;
}
