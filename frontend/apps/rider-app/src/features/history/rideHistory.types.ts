export type RideHistoryFilter = "all" | "active" | "completed" | "cancelled";

export interface RideLocation {
  address: string | null;
  latitude: number;
  longitude: number;
}

export interface RideHistoryItem {
  id: string;
  bookingCode: string;
  lifecycleStatus: string;
  pickup: RideLocation;
  dropoff: RideLocation;
  vehicleType: string;
  driverName: string | null;
  totalFare: number;
  currency: string;
  routeAccuracyScore: number;
  fairPriceScore: number;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string | null;
}

export interface FareHistoryItem {
  id: string;
  vehicleType: string;
  totalFare: number;
  currency: string;
  distanceKm: number;
  requestedAt: string | null;
  createdAt: string | null;
}

export interface RideReceipt {
  ride: {
    id: string;
    bookingCode: string;
    lifecycleStatus: string;
    pickup: RideLocation;
    dropoff: RideLocation;
    vehicleType: string;
    driver: {
      driverId: string | null;
      fullName: string | null;
      rating: number;
      vehicleName: string | null;
      vehicleNumber: string | null;
      vehicleColor: string | null;
      etaMinutes: number;
      distanceKm: number;
    };
  };
  receipt: {
    receiptNumber: string;
    issuedAt: string;
    currency: string;
    lineItems: Array<{
      code: string;
      label: string;
      amount: number;
    }>;
    fareSummary: {
      distanceKm: number;
      durationMinutes: number;
      surgeMultiplier: number;
      fareConfidenceScore: number;
    };
    trustSummary: {
      fairPriceScore: number;
      routeAccuracyScore: number;
      driverTrustScore: number;
      cancellationRiskLevel: string | null;
    };
    paymentSummary: {
      method: string | null;
      payableAmount: number;
      paidAmount: number;
      refundedAmount: number;
    };
  };
}

export interface RideHistoryTransparency {
  rideCount: number;
  totalSpend: number;
  averageFare: number;
  averageFairPriceScore: number;
  averageRouteAccuracyScore: number;
  cancellationCount: number;
  highConfidenceFareCount: number;
}
