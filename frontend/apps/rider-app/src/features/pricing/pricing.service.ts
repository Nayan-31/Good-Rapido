import type { ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type { BookingHomeForm } from "@/features/booking/booking.types";
import type { PricingQuote } from "./pricing.types";
import { buildPricingQuotePayload } from "./pricing.utils";

type PricingQuoteResponse = ApiResponse<{
  quote: PricingQuote;
}>;

export const pricingService = {
  quote(form: BookingHomeForm) {
    return apiClient.core.pricingEngine.quote(buildPricingQuotePayload(form)) as Promise<PricingQuoteResponse>;
  }
};
