import type { HttpClient } from "../shared/httpClient";
import { pathWithParams } from "../shared/path";
import type { ApiPayload, ApiQuery } from "../types";

export const createCoreApi = (http: HttpClient) => ({
  identity: {
    getOptions: () => http.get("/api/v1/core/identity/options"),
    getMe: () => http.get("/api/v1/core/identity/me"),
    upsertMe: (payload: ApiPayload) => http.put("/api/v1/core/identity/me", payload),
    submitMe: () => http.post("/api/v1/core/identity/me/submit"),
    getReviewQueue: (query?: ApiQuery) => http.get("/api/v1/core/identity/review-queue", { query }),
    getVerification: (identityId: string) =>
      http.get(pathWithParams("/api/v1/core/identity/verifications/:identityId", { identityId })),
    reviewVerification: (identityId: string, payload: ApiPayload) =>
      http.patch(pathWithParams("/api/v1/core/identity/verifications/:identityId/review", { identityId }), payload)
  },
  rideLifecycle: {
    getOptions: () => http.get("/api/v1/core/ride-lifecycle/options"),
    getRideLifecycle: (rideId: string) =>
      http.get(pathWithParams("/api/v1/core/ride-lifecycle/rides/:rideId", { rideId })),
    transitionRide: (rideId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/core/ride-lifecycle/rides/:rideId/events", { rideId }), payload)
  },
  pricingEngine: {
    getOptions: () => http.get("/api/v1/core/pricing-engine/options"),
    quote: (payload: ApiPayload) => http.post("/api/v1/core/pricing-engine/quote", payload),
    compare: (payload: ApiPayload) => http.post("/api/v1/core/pricing-engine/compare", payload)
  },
  matchingEngine: {
    getOptions: () => http.get("/api/v1/core/matching-engine/options"),
    match: (payload: ApiPayload) => http.post("/api/v1/core/matching-engine/match", payload)
  },
  routeEngine: {
    getOptions: () => http.get("/api/v1/core/route-engine/options"),
    plan: (payload: ApiPayload) => http.post("/api/v1/core/route-engine/plan", payload)
  },
  trustEngine: {
    getOptions: () => http.get("/api/v1/core/trust-engine/options"),
    assess: (payload: ApiPayload) => http.post("/api/v1/core/trust-engine/assess", payload),
    evaluateDriver: (payload: ApiPayload) => http.post("/api/v1/core/trust-engine/drivers/evaluate", payload)
  },
  fraudEngine: {
    getOptions: () => http.get("/api/v1/core/fraud-engine/options"),
    assess: (payload: ApiPayload) => http.post("/api/v1/core/fraud-engine/assess", payload)
  },
  paymentEngine: {
    getOptions: () => http.get("/api/v1/core/payment-engine/options"),
    previewIntent: (payload: ApiPayload) => http.post("/api/v1/core/payment-engine/intents/preview", payload),
    previewRefund: (payload: ApiPayload) => http.post("/api/v1/core/payment-engine/refunds/preview", payload)
  },
  notificationEngine: {
    getOptions: () => http.get("/api/v1/core/notification-engine/options"),
    planDelivery: (payload: ApiPayload) => http.post("/api/v1/core/notification-engine/delivery/plan", payload),
    compose: (payload: ApiPayload) => http.post("/api/v1/core/notification-engine/compose", payload)
  }
});
