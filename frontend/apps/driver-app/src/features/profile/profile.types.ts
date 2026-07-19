export interface DriverProfileVehicle {
  id: string;
  label: string;
  make: string;
  model: string;
  registrationNumber: string;
  status: string;
  insuranceExpiresAt: string;
}

export interface DriverProfileDocument {
  type: string;
  label: string;
  status: string;
  required: boolean;
}

export interface DriverAccountSettings {
  rideRequestsEnabled: boolean;
  marketingOptIn: boolean;
  safetyTrainingAccepted: boolean;
  preferredContactChannel: string;
}

export interface DriverProfileView {
  driverName: string;
  driverCode: string;
  bio: string;
  serviceZone: string;
  approvalStatus: string;
  onboardingStatus: string;
  vehicle: DriverProfileVehicle;
  documents: DriverProfileDocument[];
  documentPercent: number;
  settings: DriverAccountSettings;
  safetyCards: Array<{
    title: string;
    value: string;
    helper: string;
  }>;
  backendNote: string | null;
}
