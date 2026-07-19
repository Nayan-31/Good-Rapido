import { ApiClientError, type ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
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
    let profile = demoTrustProfile;

    try {
      const response = await apiClient.private.trust.listProfiles({
        subjectType: "driver",
        limit: 1
      }) as TrustListResponse;
      const backendProfile = response.data?.trust?.profiles?.[0];

      if (backendProfile) {
        profile = mapTrustProfile(backendProfile);
      }
    } catch (error) {
      notes.push(resolveBackendNote(error, "Private trust profile is wired, but driver read access is not available yet."));
    }

    try {
      const response = await apiClient.core.trustEngine.evaluateDriver({
        driver: {
          driverId: "driver-demo-001",
          fullName: profile.driverName,
          trustScore: profile.trustScore,
          reliabilityScore: profile.reliabilityScore,
          routeFairnessScore: profile.routeFairnessScore,
          onTimeArrivalScore: profile.reliabilityScore,
          cancellationRiskScore: Math.max(100 - profile.cancellationScore, 0),
          cancellationRiskLevel: profile.riskLevel === "high" ? "high" : profile.riskLevel === "medium" ? "medium" : "low",
          cancellationRatio: profile.cancellationRatio,
          detourPercentage: 1.2,
          completedRides: profile.completedRides,
          rating: 4.9
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
      notes.push(resolveBackendNote(error, "Core trust-engine evaluation is wired, but current driver token cannot evaluate directly."));
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
  const overall = safeNumber(profile.scores?.overall, profile.overallScore, demoTrustProfile.trustScore);
  const cancellation = safeNumber(profile.scores?.cancellation, demoTrustProfile.cancellationScore);
  const reliability = safeNumber(profile.scores?.reliability, demoTrustProfile.reliabilityScore);
  const safety = safeNumber(profile.scores?.safety, demoTrustProfile.safetyScore);
  const completedRides = safeNumber(profile.metrics?.completedRides, demoTrustProfile.completedRides);
  const cancelledRides = safeNumber(profile.metrics?.cancelledRides, 18);

  return {
    ...demoTrustProfile,
    driverName: profile.subjectLabel || demoTrustProfile.driverName,
    trustCode: profile.trustCode || demoTrustProfile.trustCode,
    trustScore: overall,
    trustLevel: overall >= 90 ? "Elite" : overall >= 80 ? "Strong" : "Monitor",
    cancellationScore: cancellation,
    reliabilityScore: reliability,
    safetyScore: safety,
    completedRides,
    cancellationRatio: completedRides ? Math.round((cancelledRides / completedRides) * 1000) / 10 : demoTrustProfile.cancellationRatio,
    riskLevel: profile.riskLevel || demoTrustProfile.riskLevel,
    reviewStatus: profile.reviewStatus || demoTrustProfile.reviewStatus,
    nextAction: profile.guidance?.nextAction || demoTrustProfile.nextAction
  };
};

const buildScores = (profile: DriverTrustProfileView) => [
  { label: "Cancellation score", value: profile.cancellationScore, helper: `${profile.cancellationRatio}% cancellation ratio` },
  { label: "Route fairness", value: profile.routeFairnessScore, helper: "Fair route consistency" },
  { label: "Reliability", value: profile.reliabilityScore, helper: "On-time pickup and completion" },
  { label: "Safety score", value: profile.safetyScore, helper: "Safety and compliance signals" }
];

const buildTips = (profile: DriverTrustProfileView) => {
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
