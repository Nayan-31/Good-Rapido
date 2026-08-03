import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiClientError } from "@good-rapido/api-client";
import { rideFlowStorage } from "@/features/booking/rideFlowStorage";
import type { RideFlowDraft } from "@/features/booking/rideFlowStorage";
import { matchingService, type DriverMatch } from "@/features/matching";
import { confirmRideService } from "./confirmRide.service";
import type { RideBooking, RideLifecycleView } from "./confirmRide.types";

export function useConfirmRide() {
  const [draft, setDraft] = useState<RideFlowDraft | null>(() => rideFlowStorage.read());
  const [drivers, setDrivers] = useState<DriverMatch[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [booking, setBooking] = useState<RideBooking | null>(() => (rideFlowStorage.read()?.booking as RideBooking | undefined) ?? null);
  const [lifecycle, setLifecycle] = useState<RideLifecycleView | null>(() => (rideFlowStorage.read()?.lifecycle as RideLifecycleView | undefined) ?? null);
  const [isMatching, setIsMatching] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    const currentDraft = rideFlowStorage.read();
    setDraft(currentDraft);
    setMessage(null);

    if (!currentDraft?.form) {
      return;
    }

    setIsMatching(true);

    try {
      const fareEstimateId = currentDraft.fareEstimate?.id;
      const response = fareEstimateId
        ? await matchingService.searchRideBookingDrivers(fareEstimateId)
        : await matchingService.match(currentDraft.form);
      const nextDrivers = response.data?.matching.matches ?? [];

      setDrivers(nextDrivers);
      setSelectedDriverId((currentDriverId) => currentDriverId ?? nextDrivers[0]?.driverId ?? null);
      setMessage(response.message);
    } catch (error) {
      setMessage(resolveErrorMessage(error));
    } finally {
      setIsMatching(false);
    }
  }, []);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const selectedDriver = useMemo(
    () => drivers.find((driver) => driver.driverId === selectedDriverId) ?? null,
    [drivers, selectedDriverId]
  );

  const confirmRide = useCallback(async () => {
    const currentDraft = rideFlowStorage.read();
    const fareEstimateId = currentDraft?.fareEstimate?.id;

    if (!fareEstimateId || !selectedDriverId) {
      setMessage("Select a fare estimate and driver before confirming ride");
      return;
    }

    setIsConfirming(true);
    setMessage(null);

    try {
      const bookingResponse = await confirmRideService.createBooking(fareEstimateId, selectedDriverId);
      const createdBooking = bookingResponse.data?.booking;

      if (!createdBooking?.id) {
        throw new Error("Ride booking was not created");
      }

      const lifecycleResponse = await confirmRideService.getLifecycle(createdBooking.id);
      const nextLifecycle = lifecycleResponse.data?.lifecycle ?? null;

      setBooking(createdBooking);
      setLifecycle(nextLifecycle);
      setMessage(bookingResponse.message);
      rideFlowStorage.update({
        selectedDriver,
        booking: createdBooking,
        lifecycle: nextLifecycle
      });
      window.location.hash = "/ride";
    } catch (error) {
      setMessage(resolveErrorMessage(error));
    } finally {
      setIsConfirming(false);
    }
  }, [selectedDriver, selectedDriverId]);

  return {
    draft,
    drivers,
    selectedDriver,
    selectedDriverId,
    booking,
    lifecycle,
    isMatching,
    isConfirming,
    message,
    loadMatches,
    selectDriver: setSelectedDriverId,
    confirmRide
  };
}

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return "Confirm ride request failed";
};
