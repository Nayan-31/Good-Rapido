import { useCallback, useEffect, useState } from "react";

import { ApiClientError } from "@good-rapido/api-client";
import { rideFlowStorage } from "@/features/booking/rideFlowStorage";
import type { RideFlowDraft } from "@/features/booking/rideFlowStorage";
import { pricingService } from "./pricing.service";
import type { PricingQuote } from "./pricing.types";

export function usePricingEstimate() {
  const [draft, setDraft] = useState<RideFlowDraft | null>(() => rideFlowStorage.read());
  const [quote, setQuote] = useState<PricingQuote | null>(() => (rideFlowStorage.read()?.pricingQuote as PricingQuote | undefined) ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadQuote = useCallback(async () => {
    const currentDraft = rideFlowStorage.read();
    setDraft(currentDraft);
    setMessage(null);

    if (!currentDraft?.form) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await pricingService.quote(currentDraft.form);
      const nextQuote = response.data?.quote ?? null;

      setQuote(nextQuote);
      setMessage(response.message);

      if (nextQuote) {
        rideFlowStorage.update({
          pricingQuote: nextQuote
        });
      }
    } catch (error) {
      setMessage(resolveErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuote();
  }, [loadQuote]);

  const continueToConfirm = useCallback(() => {
    if (quote) {
      rideFlowStorage.update({
        pricingQuote: quote
      });
      window.location.hash = "/confirm";
    }
  }, [quote]);

  return {
    draft,
    quote,
    isLoading,
    message,
    loadQuote,
    continueToConfirm
  };
}

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return "Pricing quote request failed";
};
