import { ApiClientError, type ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import { readDriverAuthSession } from "@/features/auth/authStorage";
import type { DriverTrustProfileView } from "./trust.types";

type TrustListResponse = ApiResponse<{
  trust?: {
    profiles?: BackendTrustProfile[];
  };
}>;

type DriverEvaluationResponse = ApiResponse<{
  evaluation?: {
    trust?: {
      score?: number;
      level?: string | null;
      message?: string | null;
    };
    reliability?: {
      score?: number;
      onTimeArrivalScore?: number;
    };
    routeFairness?: {
      score?: number;
      level?: string | null;
      detourPercentage?: number;
    };
    cancellationRisk?: {
      score?: number;
      level?: string | null;
      cancellationRatio?: number;
      message?: string | null;
    };
  };
}>;

interface BackendTrustProfile {
  id?: string | null;
  trustCode?: string | null;
  subjectLabel?: string | null;
  riskLevel?: string | null;
  reviewStatus?: string | null;
  overallScore?: number;
  scores?: {
    overall?: number;
    safety?: number;
    reliability?: number;
    cancellation?: number;
  };
  metrics?: {
    completedRides?: number;
    cancelledRides?: number;
    ratingAverage?: number | null;
  };
  guidance?: {
    nextAction?: string | null;
  };
}

type DriverProfileResponse = ApiResponse<{
  profile?: {
    auth?: {
      id?: string | null;
      fullName?: string | null;
      employeeCode?: string | null;
    };
    driver?: {
      id?: string | null;
      driverCode?: string | null;
      profile?: {
        displayName?: string | null;
      };
    };
  };
}>;

export const createEmptyTrustProfile = (): DriverTrustProfileView => {
  const authUser = readDriverAuthSession()?.user;
  const driverName = authUser?.fullName || "Driver";
  const trustCode = authUser?.employeeCode ? `TRUST-${authUser.employeeCode}` : "Not scored";

  return {
    driverName,
    trustCode,
    trustScore: 0,
    trustLevel: "Not scored",
    cancellationScore: 0,
    routeFairnessScore: 0,
    reliabilityScore: 0,
    safetyScore: 0,
    completedRides: 0,
    cancellationRatio: 0,
    riskLevel: "pending",
    reviewStatus: "pending",
    nextAction: "Complete real rides to generate trust signals.",
    scores: [
      { label: "Cancellation score", value: 0, helper: "Waiting for ride history" },
      { label: "Route fairness", value: 0, helper: "Waiting for route data" },
      { label: "Reliability", value: 0, helper: "Waiting for pickup data" },
      { label: "Safety score", value: 0, helper: "Waiting for compliance data" }
    ],
    tips: [
      {
        title: "Build trust history",
        description: "Go online after onboarding approval and complete rides to generate live trust signals.",
        priority: "medium"
      }
    ],
    backendNote: null
  };
};

export const demoTrustProfile: DriverTrustProfileView = {
  driverName: "Amit Das",
  trustCode: "TRUST-DRV-2401",
  trustScore: 94,
  trustLevel: "Elite",
  cancellationScore: 97,
  routeFairnessScore: 98,
  reliabilityScore: 95,
  safetyScore: 96,
  completedRides: 1280,
  cancellationRatio: 1.4,
  riskLevel: "low",
  reviewStatus: "clear",
  nextAction: "Keep route discipline and low cancellation streak active.",
  scores: [
    { label: "Cancellation score", value: 97, helper: "1.4% cancellation ratio" },
    { label: "Route fairness", value: 98, helper: "Minimal detours" },
    { label: "Reliability", value: 95, helper: "On-time arrival consistency" },
    { label: "Safety score", value: 96, helper: "No open safety flags" }
  ],
  tips: [
    {
      title: "Keep pickup ETA tight",
      description: "Accept nearby rides first to protect reliability score.",
      priority: "medium"
    },
    {
      title: "Avoid silent detours",
      description: "Use the suggested route or explain route changes before taking them.",
      priority: "low"
    },
    {
      title: "Protect cancellation streak",
      description: "Go offline before breaks so system does not assign requests you cannot complete.",
      priority: "high"
    }
  ],
  backendNote: null
};

export const driverTrustService = {
  async loadTrustProfile(): Promise<DriverTrustProfileView> {
    const notes: string[] = [];
    let profile = createEmptyTrustProfile();
    let hasBackendTrustProfile = false;

    try {
      const response = await apiClient.private.driver.getProfile() as DriverProfileResponse;
      const driver = response.data?.profile?.driver;
      const auth = response.data?.profile?.auth;

      profile = {
        ...profile,
        driverName: driver?.profile?.displayName || auth?.fullName || profile.driverName,
        trustCode: driver?.driverCode ? `TRUST-${driver.driverCode}` : profile.trustCode
      };
    } catch (error) {
      notes.push(resolveBackendNote(error, "Driver profile identity could not be loaded for trust display."));
    }

    try {
      const response = await apiClient.private.trust.listProfiles({
        subjectType: "driver",
        limit: 1
      }) as TrustListResponse;
      const backendProfile = response.data?.trust?.profiles?.[0];

      if (backendProfile) {
        profile = mapTrustProfile(backendProfile);
        hasBackendTrustProfile = true;
      }
    } catch (error) {
      notes.push(resolveBackendNote(error, "Private trust profile is wired for ops/admin review, but this driver session cannot read it directly."));
    }

    if (hasBackendTrustProfile) {
      try {
        const response = await apiClient.core.trustEngine.evaluateDriver({
          driver: {
            driverId: profile.trustCode,
            fullName: profile.driverName,
            trustScore: profile.trustScore,
            reliabilityScore: profile.reliabilityScore,
            routeFairnessScore: profile.routeFairnessScore,
            onTimeArrivalScore: profile.reliabilityScore,
            cancellationRiskScore: Math.max(100 - profile.cancellationScore, 0),
            cancellationRiskLevel: profile.riskLevel === "high" ? "high" : profile.riskLevel === "medium" ? "medium" : "low",
            cancellationRatio: profile.cancellationRatio,
            detourPercentage: Math.max(100 - profile.routeFairnessScore, 0),
            completedRides: profile.completedRides,
            rating: profile.safetyScore ? Math.min(profile.safetyScore / 20, 5) : undefined
          },
          fareSource: {
            confidenceScore: 96
          }
        }) as DriverEvaluationResponse;
        const evaluation = response.data?.evaluation;

        if (evaluation) {
          profile = {
            ...profile,
            trustScore: safeNumber(evaluation.trust?.score, profile.trustScore),
            trustLevel: evaluation.trust?.level || profile.trustLevel,
            reliabilityScore: safeNumber(evaluation.reliability?.score, profile.reliabilityScore),
            routeFairnessScore: safeNumber(evaluation.routeFairness?.score, profile.routeFairnessScore),
            cancellationRatio: safeNumber(evaluation.cancellationRisk?.cancellationRatio, profile.cancellationRatio),
            riskLevel: evaluation.cancellationRisk?.level || profile.riskLevel
          };
        }
      } catch (error) {
        notes.push(resolveBackendNote(error, "Core trust-engine evaluation is wired, but current trust signal payload could not be evaluated."));
      }
    } else if (shouldUseDemoTrustFallback()) {
      profile = demoTrustProfile;
      notes.push("Demo trust fallback is enabled through VITE_USE_DEMO_DRIVER_DATA.");
    }

    return {
      ...profile,
      scores: buildScores(profile),
      tips: buildTips(profile),
      backendNote: uniqueNotes(notes)
    };
  }
};

const mapTrustProfile = (profile: BackendTrustProfile): DriverTrustProfileView => {
  const emptyProfile = createEmptyTrustProfile();
  const overall = safeNumber(profile.scores?.overall, profile.overallScore);
  const cancellation = safeNumber(profile.scores?.cancellation, overall);
  const reliability = safeNumber(profile.scores?.reliability, overall);
  const safety = safeNumber(profile.scores?.safety, overall);
  const completedRides = safeNumber(profile.metrics?.completedRides);
  const cancelledRides = safeNumber(profile.metrics?.cancelledRides);

  return {
    ...emptyProfile,
    driverName: profile.subjectLabel || emptyProfile.driverName,
    trustCode: profile.trustCode || emptyProfile.trustCode,
    trustScore: overall,
    trustLevel: overall >= 90 ? "Elite" : overall >= 80 ? "Strong" : overall > 0 ? "Monitor" : "Not scored",
    cancellationScore: cancellation,
    reliabilityScore: reliability,
    safetyScore: safety,
    completedRides,
    cancellationRatio: completedRides ? Math.round((cancelledRides / completedRides) * 1000) / 10 : 0,
    riskLevel: profile.riskLevel || "pending",
    reviewStatus: profile.reviewStatus || "pending",
    nextAction: profile.guidance?.nextAction || "Complete rides to generate trust signals."
  };
};

const buildScores = (profile: DriverTrustProfileView) => [
  { label: "Cancellation score", value: profile.cancellationScore, helper: `${profile.cancellationRatio}% cancellation ratio` },
  { label: "Route fairness", value: profile.routeFairnessScore, helper: "Fair route consistency" },
  { label: "Reliability", value: profile.reliabilityScore, helper: "On-time pickup and completion" },
  { label: "Safety score", value: profile.safetyScore, helper: "Safety and compliance signals" }
];

const buildTips = (profile: DriverTrustProfileView) => {
  if (!profile.completedRides) {
    return [
      {
        title: "Build trust history",
        description: "Go online after onboarding approval and complete rides to generate live trust signals.",
        priority: "medium" as const
      }
    ];
  }

  const tips = [...demoTrustProfile.tips];

  if (profile.cancellationScore < 90) {
    tips.unshift({
      title: "Reduce cancellations",
      description: "Use offline mode before breaks and avoid accepting rides outside your reachable zone.",
      priority: "high"
    });
  }

  if (profile.routeFairnessScore < 94) {
    tips.unshift({
      title: "Improve route fairness",
      description: "Follow route-engine suggestions and add context for unavoidable diversions.",
      priority: "medium"
    });
  }

  return tips.slice(0, 4);
};

const resolveBackendNote = (error: unknown, fallback: string) => {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
    return `${fallback} Backend returned ${error.status}; trust routes currently require ops/admin access.`;
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

const shouldUseDemoTrustFallback = () => import.meta.env.VITE_USE_DEMO_DRIVER_DATA === "true";
