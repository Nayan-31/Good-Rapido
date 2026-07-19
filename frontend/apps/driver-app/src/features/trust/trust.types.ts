export interface DriverTrustScore {
  label: string;
  value: number;
  helper: string;
}

export interface DriverTrustTip {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
}

export interface DriverTrustProfileView {
  driverName: string;
  trustCode: string;
  trustScore: number;
  trustLevel: string;
  cancellationScore: number;
  routeFairnessScore: number;
  reliabilityScore: number;
  safetyScore: number;
  completedRides: number;
  cancellationRatio: number;
  riskLevel: string;
  reviewStatus: string;
  nextAction: string;
  scores: DriverTrustScore[];
  tips: DriverTrustTip[];
  backendNote: string | null;
}
