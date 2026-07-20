export interface FraudSummary {
  totalCases: number;
  openCases: number;
  underReviewCases: number;
  confirmedCases: number;
  dismissedCases: number;
  resolvedCases: number;
  highRiskCases: number;
  criticalRiskCases: number;
  averageRiskScore: number;
}

export interface FraudGuidance {
  canAssign: boolean;
  canConfirm: boolean;
  canDismiss: boolean;
  canResolve: boolean;
  shouldBlockAccount: boolean;
  shouldHoldPayout: boolean;
  nextAction: string;
}

export interface FraudCaseItem {
  id: string;
  caseCode: string | null;
  subjectType: string | null;
  subjectId: string | null;
  subjectLabel: string | null;
  caseType: string | null;
  severity: string;
  status: string;
  riskScore: number;
  confidenceScore: number;
  assignedReviewerId: string | null;
  latestReviewNote: string | null;
  guidance: FraudGuidance;
}

export interface FraudCase extends FraudCaseItem {
  signals: Record<string, number>;
  evidence: Array<Record<string, string | null>>;
  actions: Record<string, boolean | string | null>;
  resolution: Record<string, string | null>;
}

export interface FraudDashboard {
  summary: FraudSummary;
  highRiskCases: FraudCaseItem[];
  openCases: FraudCaseItem[];
  recentCases: FraudCaseItem[];
}

export interface FraudCaseList {
  cases: FraudCaseItem[];
  summary: FraudSummary;
}

export interface FraudSimulation {
  riskScore: number;
  confidenceScore: number;
  severity: string;
  status: string;
  signals: Record<string, number>;
  actions: Record<string, boolean | string | null>;
  guidance: Record<string, string | boolean>;
}

export interface DisputeSummary {
  totalDisputes: number;
  submittedCount: number;
  underReviewCount: number;
  evidenceRequestedCount: number;
  resolvedCount: number;
  rejectedCount: number;
  openCount: number;
  urgentCount: number;
  highPriorityCount: number;
  unassignedCount: number;
  requestedRefundAmount: number;
}

export interface DisputeGuidance {
  canAssign: boolean;
  canRequestEvidence: boolean;
  canResolve: boolean;
  canReject: boolean;
  nextAction: string;
}

export interface DisputeItem {
  id: string;
  disputeCode: string | null;
  bookingCode: string | null;
  type: string | null;
  reason: string | null;
  status: string;
  priority: string;
  title: string | null;
  requestedRefundAmount: number | null;
  currency: string;
  evidenceCount: number;
  guidance: DisputeGuidance;
}

export interface DisputeDetail extends DisputeItem {
  description: string | null;
  evidence: Array<Record<string, string | null>>;
  resolution: Record<string, string | number | null> | null;
}

export interface DisputeDashboard {
  summary: DisputeSummary;
  urgentQueue: DisputeItem[];
  openQueue: DisputeItem[];
  recentActivity: DisputeItem[];
}

export interface DisputeQueue {
  disputes: DisputeItem[];
  summary: DisputeSummary;
}
