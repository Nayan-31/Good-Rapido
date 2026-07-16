import type { RideHistoryItem } from "@/features/history/rideHistory.types";

export interface RiderProfile {
  id: string;
  authUserId: string;
  role: string;
  displayName: string | null;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  savedAddresses: SavedAddress[];
  emergencyContacts: EmergencyContact[];
  preferences: ProfilePreferences;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SavedAddress {
  id: string;
  label: string;
  addressLine: string;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  location: {
    latitude?: number;
    longitude?: number;
  } | null;
  isDefault: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProfilePreferences {
  language: string;
  notifications: {
    sms: boolean;
    email: boolean;
    push: boolean;
  };
}

export interface ProfileTransparency {
  totalRides: number;
  averageFairPriceScore: number;
  averageRouteAccuracyScore: number;
  cancelledRides: number;
  safetyReady: boolean;
  savedAddressReady: boolean;
  notificationCoverage: number;
}

export interface ProfileDashboard {
  profile: RiderProfile | null;
  rideHistory: RideHistoryItem[];
  transparency: ProfileTransparency;
}
