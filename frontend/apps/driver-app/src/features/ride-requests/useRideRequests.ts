import { useCallback, useEffect, useState } from "react";

import { rideRequestService } from "./rideRequest.service";
import type { DriverRideRequest } from "./rideRequest.types";

export function useRideRequests(onRideAccepted?: () => void) {
  const [request, setRequest] = useState<DriverRideRequest | null>(null);
  const [backendNote, setBackendNote] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [declinedRequestCode, setDeclinedRequestCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await rideRequestService.loadIncomingRequest();
      setRequest(result.request);
      setBackendNote(result.backendNote);
    } catch (loadError) {
      setError(resolveError(loadError, "Unable to load ride request"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const acceptRequest = useCallback(async () => {
    if (!request) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const result = await rideRequestService.acceptRide(request);
      setMessage(result.message);
      setBackendNote(result.backendNote ?? backendNote);
      onRideAccepted?.();
    } catch (acceptError) {
      setError(resolveError(acceptError, "Unable to accept ride request"));
    } finally {
      setIsSaving(false);
    }
  }, [backendNote, onRideAccepted, request]);

  const declineRequest = useCallback(async () => {
    if (!request) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const result = await rideRequestService.declineRide(request);
      setDeclinedRequestCode(request.bookingCode);
      setRequest(null);
      setMessage(result.message);
      setBackendNote(result.backendNote ?? backendNote);
    } catch (declineError) {
      setError(resolveError(declineError, "Unable to decline ride request"));
    } finally {
      setIsSaving(false);
    }
  }, [backendNote, request]);

  return {
    request,
    backendNote,
    message,
    error,
    isLoading,
    isSaving,
    declinedRequestCode,
    reload: load,
    acceptRequest,
    declineRequest
  };
}

const resolveError = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};
