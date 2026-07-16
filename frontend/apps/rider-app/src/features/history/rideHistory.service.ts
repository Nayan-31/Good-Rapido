import type { ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type { FareHistoryItem, RideHistoryFilter, RideHistoryItem, RideReceipt } from "./rideHistory.types";

type RideHistoryResponse = ApiResponse<{
  history: RideHistoryItem[];
}>;

type FareHistoryResponse = ApiResponse<{
  history: FareHistoryItem[];
}>;

type RideReceiptResponse = ApiResponse<RideReceipt>;

export const rideHistoryService = {
  getRideHistory(filter: RideHistoryFilter) {
    return apiClient.public.rides.getHistory({
      status: filter,
      limit: 12
    }) as Promise<RideHistoryResponse>;
  },
  getFareHistory() {
    return apiClient.public.fare.getHistory({
      limit: 8
    }) as Promise<FareHistoryResponse>;
  },
  getReceipt(rideId: string) {
    return apiClient.public.rides.getReceipt(rideId) as Promise<RideReceiptResponse>;
  }
};
