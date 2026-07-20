export interface TrustSummary {
  totalProfiles: number;
  lowRiskProfiles: number;
  mediumRiskProfiles: number;
  highRiskProfiles: number;
  criticalRiskProfiles: number;
  openReviews: number;
  underReviewProfiles: number;
  resolvedReviews: number;
  restrictedProfiles: number;
  suspendedProfiles: number;
  averageOverallScore: number;
}

export interface TrustGuidance {
  canAssign: boolean;
  canAddNote: boolean;
  canResolve: boolean;
  shouldBlockBooking: boolean;
  shouldHoldPayout: boolean;
  nextAction: string;
}

export interface TrustProfileItem {
  id: string;
  trustCode: string | null;
  subjectType: string | null;
  subjectId: string | null;
  subjectLabel: string | null;
  riskLevel: string;
  status: string;
  reviewStatus: string;
  overallScore: number;
  assignedReviewerId: string | null;
  latestReviewNote: string | null;
  updatedAt: string | null;
  guidance: TrustGuidance;
}

export interface TrustProfile extends TrustProfileItem {
  scores: Record<string, number>;
  metrics: Record<string, number | string | null>;
  restrictions: {
    rideBookingBlocked: boolean;
    driverPayoutHold: boolean;
    promoBlocked: boolean;
    reason: string | null;
    expiresAt: string | null;
  };
  actionLog: Array<{
    action: string | null;
    note: string | null;
    actorRole: string | null;
    createdAt: string | null;
  }>;
}

export interface TrustDashboard {
  summary: TrustSummary;
  highRiskProfiles: TrustProfileItem[];
  openReviews: TrustProfileItem[];
  recentProfiles: TrustProfileItem[];
}

export interface TrustProfileList {
  profiles: TrustProfileItem[];
  summary: TrustSummary;
}

export interface DocumentReviewQueueItem {
  driver: {
    id: string;
    driverCode: string | null;
    displayName: string | null;
    serviceZone: string | null;
  };
  documents: {
    status: string;
    completion: {
      percent: number;
      approvedRequiredDocuments: number;
      requiredDocuments: number;
    };
    documents: Array<{
      type: string;
      label: string;
      required: boolean;
      status: string;
      documentNumber: string | null;
      holderName: string | null;
    }>;
    guidance: {
      requiresReview: boolean;
      nextAction: string;
    };
  };
}

export interface VehicleReviewQueueItem {
  driver: {
    id: string;
    driverCode: string | null;
    displayName: string | null;
    serviceZone: string | null;
  };
  vehicle: {
    id: string;
    type: string | null;
    label: string | null;
    make: string | null;
    model: string | null;
    registrationNumber: string | null;
    status: string;
    guidance: {
      requiresReview: boolean;
      needsRevision: boolean;
    };
  };
}
