import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiClientError } from "@good-rapido/api-client";
import { rideHistoryService } from "./rideHistory.service";
import type { FareHistoryItem, RideHistoryFilter, RideHistoryItem, RideReceipt } from "./rideHistory.types";
import { buildRideHistoryTransparency } from "./rideHistory.utils";

export function useRideHistory() {
  const [filter, setFilter] = useState<RideHistoryFilter>("all");
  const [rides, setRides] = useState<RideHistoryItem[]>([]);
  const [fares, setFares] = useState<FareHistoryItem[]>([]);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<RideReceipt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReceiptLoading, setIsReceiptLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadHistory = useCallback(async (nextFilter = filter) => {
    setIsLoading(true);
    setFilter(nextFilter);
    setMessage(null);

    const [ridesResult, faresResult] = await Promise.allSettled([
      rideHistoryService.getRideHistory(nextFilter),
      rideHistoryService.getFareHistory()
    ]);

    if (ridesResult.status === "fulfilled") {
      const nextRides = ridesResult.value.data?.history ?? [];
      setRides(nextRides);
      setSelectedRideId((currentRideId) => currentRideId ?? nextRides[0]?.id ?? null);
    }

    if (faresResult.status === "fulfilled") {
      setFares(faresResult.value.data?.history ?? []);
    }

    if (ridesResult.status === "rejected" && faresResult.status === "rejected") {
      setMessage(resolveErrorMessage(ridesResult.reason));
    }

    setIsLoading(false);
  }, [filter]);

  useEffect(() => {
    void loadHistory("all");
  }, []);

  const selectedRide = useMemo(
    () => rides.find((ride) => ride.id === selectedRideId) ?? null,
    [rides, selectedRideId]
  );

  const loadReceipt = useCallback(async (rideId: string) => {
    setSelectedRideId(rideId);
    setIsReceiptLoading(true);
    setMessage(null);

    try {
      const response = await rideHistoryService.getReceipt(rideId);
      setReceipt(response.data ?? null);
      setMessage(response.message);
    } catch (error) {
      setMessage(resolveErrorMessage(error));
    } finally {
      setIsReceiptLoading(false);
    }
  }, []);

  return {
    filter,
    rides,
    fares,
    selectedRide,
    receipt,
    transparency: buildRideHistoryTransparency(rides, fares),
    isLoading,
    isReceiptLoading,
    message,
    loadHistory,
    loadReceipt
  };
}

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return "Ride history request failed";
};
