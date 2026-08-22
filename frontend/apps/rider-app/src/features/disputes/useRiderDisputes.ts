import { useCallback, useEffect, useState } from "react";

import { ApiClientError } from "@good-rapido/api-client";
import { defaultDisputeForm, disputesService, emptyDisputeSummary } from "./disputes.service";
import type { RiderDisputeForm, RiderDisputeItem, RiderDisputeRide, RiderDisputeSummary } from "./disputes.types";

export function useRiderDisputes() {
  const [summary, setSummary] = useState<RiderDisputeSummary>(emptyDisputeSummary);
  const [disputes, setDisputes] = useState<RiderDisputeItem[]>([]);
  const [rides, setRides] = useState<RiderDisputeRide[]>([]);
  const [form, setForm] = useState<RiderDisputeForm>(defaultDisputeForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDisputes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await disputesService.load();
      setSummary(data.summary);
      setDisputes(data.disputes);
      setRides(data.rides);
      setForm((current) => ({
        ...current,
        rideId: current.rideId || data.rides[0]?.id || ""
      }));
    } catch (caughtError) {
      setSummary(emptyDisputeSummary);
      setDisputes([]);
      setRides([]);
      setError(resolveErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDisputes();
  }, [loadDisputes]);

  const submitDispute = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await disputesService.submitDispute(form);
      setMessage(response.message || "Dispute submitted successfully");
      await loadDisputes();
    } catch (caughtError) {
      setError(resolveErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }, [form, loadDisputes]);

  const addEvidence = useCallback(async (disputeId: string) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await disputesService.addEvidence(disputeId, form.evidenceNote);
      setMessage(response.message || "Evidence added successfully");
      await loadDisputes();
    } catch (caughtError) {
      setError(resolveErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }, [form.evidenceNote, loadDisputes]);

  const cancelDispute = useCallback(async (disputeId: string) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await disputesService.cancelDispute(disputeId);
      setMessage(response.message || "Dispute cancelled successfully");
      await loadDisputes();
    } catch (caughtError) {
      setError(resolveErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }, [loadDisputes]);

  return {
    summary,
    disputes,
    rides,
    form,
    setForm,
    isLoading,
    isSaving,
    message,
    error,
    loadDisputes,
    submitDispute,
    addEvidence,
    cancelDispute
  };
}

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return "Dispute request failed";
};
