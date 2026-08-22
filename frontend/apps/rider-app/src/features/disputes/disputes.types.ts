export interface RiderDisputeSummary {
  totalDisputes: number;
  openCount: number;
  resolvedCount: number;
  cancelledCount: number;
  urgentCount: number;
  latestSubmittedAt: string | null;
}

export interface RiderDisputeRide {
  id: string;
  bookingCode: string;
  lifecycleStatus: string;
  pickup: {
    address: string | null;
  };
  dropoff: {
    address: string | null;
  };
  totalFare: number;
  currency: string;
  completedAt: string | null;
  cancelledAt: string | null;
}

export interface RiderDisputeItem {
  id: string;
  disputeCode: string | null;
  rideId: string | null;
  bookingCode: string | null;
  type: string | null;
  reason: string | null;
  status: string;
  priority: string;
  title: string | null;
  requestedRefundAmount: number | null;
  currency: string;
  evidenceCount: number;
  submittedAt: string | null;
  resolvedAt: string | null;
  cancelledAt: string | null;
  latestActivityAt: string | null;
}

export interface RiderDisputeForm {
  rideId: string;
  type: string;
  reason: string;
  title: string;
  description: string;
  requestedResolution: string;
  requestedRefundAmount: string;
  evidenceNote: string;
}
