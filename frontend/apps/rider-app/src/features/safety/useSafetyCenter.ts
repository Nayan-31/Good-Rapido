import { useCallback, useEffect, useState } from "react";

import { ApiClientError } from "@good-rapido/api-client";
import { rideFlowStorage } from "@/features/booking/rideFlowStorage";
import type { RideFlowDraft } from "@/features/booking/rideFlowStorage";
import { safetyService } from "./safety.service";
import { getRideIdFromDraft } from "./safety.utils";
import type { CurrentRide, SupportSummary } from "./safety.types";

export function useSafetyCenter() {
  const [draft, setDraft] = useState<RideFlowDraft | null>(() => rideFlowStorage.read());
  const [supportSummary, setSupportSummary] = useState<SupportSummary | null>(null);
  const [currentRide, setCurrentRide] = useState<CurrentRide | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadSafety = useCallback(async () => {
    setIsLoading(true);
    setDraft(rideFlowStorage.read());
    setMessage(null);

    const [summaryResult, rideResult] = await Promise.allSettled([
      safetyService.getSupportSummary(),
      safetyService.getCurrentRide()
    ]);

    if (summaryResult.status === "fulfilled") {
      setSupportSummary(summaryResult.value.data?.summary ?? null);
    }

    if (rideResult.status === "fulfilled") {
      setCurrentRide((rideResult.value.data?.ride as CurrentRide | undefined) ?? null);
    }

    if (summaryResult.status === "rejected" && rideResult.status === "rejected") {
      setMessage(resolveErrorMessage(summaryResult.reason));
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadSafety();
  }, [loadSafety]);

  const sendSafetySignal = useCallback(async (subject: string, supportMessage: string, urgent = false) => {
    setIsSending(true);
    setMessage(null);

    try {
      const rideId = getRideIdFromDraft(rideFlowStorage.read()) ?? currentRide?.id ?? null;
      const response = await safetyService.contactSafetySupport({
        rideId,
        subject,
        message: supportMessage,
        urgent
      });

      setMessage(response.message);
      await loadSafety();
    } catch (error) {
      setMessage(resolveErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  }, [currentRide?.id, loadSafety]);

  return {
    draft,
    supportSummary,
    currentRide,
    isLoading,
    isSending,
    message,
    loadSafety,
    sendSafetySignal
  };
}

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return "Safety request failed";
};
