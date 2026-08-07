import { ApiClientError, type ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import { readDriverAuthSession } from "@/features/auth/authStorage";
import type { DriverAccountSettings, DriverProfileDocument, DriverProfileVehicle, DriverProfileView } from "./profile.types";

type DriverProfileResponse = ApiResponse<{
  profile?: {
    auth?: {
      id?: string | null;
      fullName?: string | null;
      email?: string | null;
      phone?: string | null;
      employeeCode?: string | null;
      serviceZone?: string | null;
    };
    driver?: {
      driverCode?: string | null;
      profile?: {
        displayName?: string | null;
        bio?: string | null;
      };
      service?: {
        serviceZone?: string | null;
      };
      approvalStatus?: string | null;
      onboarding?: {
        status?: string | null;
      };
    };
  };
}>;

type DriverAccountResponse = ApiResponse<{
  account?: {
    accountControls?: Partial<DriverAccountSettings> | null;
    approvalStatus?: string | null;
    onboardingStatus?: string | null;
  };
}>;

type DriverVehiclesResponse = ApiResponse<{
  vehicles?: {
    vehicles?: BackendVehicle[];
    summary?: {
      primaryVehicleId?: string | null;
    };
  };
}>;

type DriverDocumentsResponse = ApiResponse<{
  documents?: {
    documents?: BackendDocument[];
    completion?: {
      percent?: number;
    };
  };
}>;

interface BackendVehicle {
  id?: string | null;
  label?: string | null;
  make?: string | null;
  model?: string | null;
  registrationNumber?: string | null;
  status?: string | null;
  isPrimary?: boolean;
  insurance?: {
    expiresAt?: string | null;
  };
}

interface BackendDocument {
  type?: string;
  label?: string;
  status?: string;
  required?: boolean;
}

export const demoProfileView: DriverProfileView = {
  driverName: "Amit Das",
  driverCode: "DRV-002",
  bio: "Safe city rides, fair routes, and clear communication.",
  serviceZone: "Kolkata",
  approvalStatus: "approved",
  onboardingStatus: "approved",
  vehicle: {
    id: "vehicle-001",
    label: "Economy cab",
    make: "Suzuki",
    model: "Dzire",
    registrationNumber: "WB 01 AC 4522",
    status: "approved",
    insuranceExpiresAt: "2026-08-12"
  },
  documents: [
    { type: "driving_license", label: "Driving license", status: "approved", required: true },
    { type: "vehicle_rc", label: "Vehicle RC", status: "approved", required: true },
    { type: "insurance", label: "Insurance", status: "under_review", required: true },
    { type: "police_verification", label: "Police verification", status: "approved", required: true }
  ],
  documentPercent: 75,
  settings: {
    rideRequestsEnabled: true,
    marketingOptIn: false,
    safetyTrainingAccepted: true,
    preferredContactChannel: "in_app"
  },
  safetyCards: [
    { title: "Safety training", value: "Accepted", helper: "Compliance ready for rides" },
    { title: "Document health", value: "75%", helper: "Insurance under review" },
    { title: "Account status", value: "Approved", helper: "Ride requests can stay enabled" }
  ],
  backendNote: null
};

export const createEmptyProfileView = (): DriverProfileView => {
  const authUser = readDriverAuthSession()?.user;

  return {
    driverName: authUser?.fullName || "Driver",
    driverCode: authUser?.employeeCode || "Not assigned",
    bio: "Complete profile setup to show your public driver bio.",
    serviceZone: authUser?.serviceZone || "not configured",
    approvalStatus: "pending",
    onboardingStatus: "not_started",
    vehicle: {
      id: "not-added",
      label: "Vehicle not added",
      make: "Not configured",
      model: "",
      registrationNumber: "Registration pending",
      status: "draft",
      insuranceExpiresAt: "Not available"
    },
    documents: [],
    documentPercent: 0,
    settings: {
      rideRequestsEnabled: false,
      marketingOptIn: false,
      safetyTrainingAccepted: false,
      preferredContactChannel: "in_app"
    },
    safetyCards: [
      { title: "Safety training", value: "Pending", helper: "Accept safety training before rides" },
      { title: "Document health", value: "0%", helper: "Upload required documents" },
      { title: "Account status", value: "Pending", helper: "Complete onboarding for ride eligibility" }
    ],
    backendNote: null
  };
};

export const driverProfileService = {
  async loadProfile(): Promise<DriverProfileView> {
    const notes: string[] = [];
    let view = createEmptyProfileView();

    try {
      const [profileResponse, accountResponse, vehiclesResponse, documentsResponse] = await Promise.all([
        apiClient.private.driver.getProfile() as Promise<DriverProfileResponse>,
        apiClient.private.driver.getAccount() as Promise<DriverAccountResponse>,
        apiClient.private.vehicle.getVehicles() as Promise<DriverVehiclesResponse>,
        apiClient.private.driverDocuments.getDocuments() as Promise<DriverDocumentsResponse>
      ]);
      view = mapProfile(profileResponse, accountResponse, vehiclesResponse, documentsResponse);
    } catch (error) {
      notes.push(resolveBackendNote(error, "Driver profile/account APIs are wired, but profile data is not available yet."));

      if (shouldUseDemoDriverDataFallback()) {
        view = demoProfileView;
        notes.push("Demo profile fallback is enabled through VITE_USE_DEMO_DRIVER_DATA.");
      }
    }

    return {
      ...view,
      backendNote: uniqueNotes(notes)
    };
  },

  async updateSettings(settings: DriverAccountSettings) {
    try {
      await apiClient.private.driver.updateAccountControls({ ...settings });
      return null;
    } catch (error) {
      return resolveBackendNote(error, "Account settings were updated locally because backend save is not available.");
    }
  }
};

const mapProfile = (
  profileResponse: DriverProfileResponse,
  accountResponse: DriverAccountResponse,
  vehiclesResponse: DriverVehiclesResponse,
  documentsResponse: DriverDocumentsResponse
): DriverProfileView => {
  const profile = profileResponse.data?.profile;
  const authUser = profile?.auth ?? readDriverAuthSession()?.user;
  const driver = profile?.driver;
  const controls = accountResponse.data?.account?.accountControls;
  const vehicles = vehiclesResponse.data?.vehicles?.vehicles ?? [];
  const documents = documentsResponse.data?.documents?.documents ?? [];
  const primaryVehicle = vehicles.find((vehicle) => vehicle.isPrimary)
    ?? vehicles.find((vehicle) => vehicle.id === vehiclesResponse.data?.vehicles?.summary?.primaryVehicleId)
    ?? vehicles[0];
  const documentPercent = safeNumber(documentsResponse.data?.documents?.completion?.percent);
  const approvalStatus = driver?.approvalStatus || accountResponse.data?.account?.approvalStatus || "pending";
  const onboardingStatus = driver?.onboarding?.status || accountResponse.data?.account?.onboardingStatus || "not_started";
  const settings = {
    rideRequestsEnabled: controls?.rideRequestsEnabled ?? false,
    marketingOptIn: controls?.marketingOptIn ?? false,
    safetyTrainingAccepted: controls?.safetyTrainingAccepted ?? false,
    preferredContactChannel: controls?.preferredContactChannel ?? "in_app"
  };

  return {
    driverName: driver?.profile?.displayName || authUser?.fullName || "Driver",
    driverCode: driver?.driverCode || authUser?.employeeCode || "Not assigned",
    bio: driver?.profile?.bio || "Complete profile setup to show your public driver bio.",
    serviceZone: driver?.service?.serviceZone || authUser?.serviceZone || "not configured",
    approvalStatus,
    onboardingStatus,
    vehicle: primaryVehicle ? mapVehicle(primaryVehicle) : createEmptyProfileView().vehicle,
    documents: documents.map(mapDocument),
    documentPercent,
    settings,
    safetyCards: [
      { title: "Safety training", value: settings.safetyTrainingAccepted ? "Accepted" : "Pending", helper: "Required for safer active rides" },
      { title: "Document health", value: `${documentPercent}%`, helper: documents.length ? "Based on required document status" : "Upload required documents" },
      { title: "Account status", value: formatStatus(approvalStatus), helper: "Controls ride request eligibility" }
    ],
    backendNote: null
  };
};

const mapVehicle = (vehicle: BackendVehicle): DriverProfileVehicle => ({
  id: vehicle.id || "vehicle-id",
  label: vehicle.label || "Vehicle",
  make: vehicle.make || "Not configured",
  model: vehicle.model || "",
  registrationNumber: vehicle.registrationNumber || "Registration pending",
  status: vehicle.status || "draft",
  insuranceExpiresAt: vehicle.insurance?.expiresAt || "Not available"
});

const mapDocument = (document: BackendDocument): DriverProfileDocument => ({
  type: document.type || "document",
  label: document.label || formatStatus(document.type || "document"),
  status: document.status || "missing",
  required: document.required !== false
});

const formatStatus = (value: string) => value.replace(/_/g, " ");

const resolveBackendNote = (error: unknown, fallback: string) => {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
    return `${fallback} Backend returned ${error.status}; driver profile permissions or session may be missing.`;
  }

  if (error instanceof Error) {
    return `${fallback} ${error.message}`;
  }

  return fallback;
};

const safeNumber = (...values: Array<number | null | undefined>) => {
  const value = values.find((candidate) => typeof candidate === "number" && Number.isFinite(candidate));
  return value ?? 0;
};

const uniqueNotes = (notes: string[]) => {
  const joinedNotes = Array.from(new Set(notes.filter(Boolean))).join(" ");
  return joinedNotes || null;
};

const shouldUseDemoDriverDataFallback = () => import.meta.env.VITE_USE_DEMO_DRIVER_DATA === "true";
