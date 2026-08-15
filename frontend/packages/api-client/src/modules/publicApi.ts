import type { HttpClient } from "../shared/httpClient";
import { pathWithParams } from "../shared/path";
import type { ApiPayload, ApiQuery } from "../types";

export const createPublicApi = (http: HttpClient) => ({
  auth: {
    registerRider: (payload: ApiPayload) => http.post("/api/v1/public/auth/riders/register", payload),
    loginRider: (payload: ApiPayload) => http.post("/api/v1/public/auth/riders/login", payload),
    refreshRider: (payload: ApiPayload) => http.post("/api/v1/public/auth/riders/refresh", payload),
    logoutRider: (payload: ApiPayload) => http.post("/api/v1/public/auth/riders/logout", payload),
    getRiderSession: () => http.get("/api/v1/public/auth/riders/me")
  },
  profile: {
    getMe: () => http.get("/api/v1/public/profile/me"),
    updateMe: (payload: ApiPayload) => http.patch("/api/v1/public/profile/me", payload),
    updatePreferences: (payload: ApiPayload) => http.patch("/api/v1/public/profile/preferences", payload),
    addSavedAddress: (payload: ApiPayload) => http.post("/api/v1/public/profile/saved-addresses", payload),
    updateSavedAddress: (addressId: string, payload: ApiPayload) =>
      http.patch(pathWithParams("/api/v1/public/profile/saved-addresses/:addressId", { addressId }), payload),
    removeSavedAddress: (addressId: string) =>
      http.delete(pathWithParams("/api/v1/public/profile/saved-addresses/:addressId", { addressId })),
    addEmergencyContact: (payload: ApiPayload) => http.post("/api/v1/public/profile/emergency-contacts", payload),
    updateEmergencyContact: (contactId: string, payload: ApiPayload) =>
      http.patch(pathWithParams("/api/v1/public/profile/emergency-contacts/:contactId", { contactId }), payload),
    removeEmergencyContact: (contactId: string) =>
      http.delete(pathWithParams("/api/v1/public/profile/emergency-contacts/:contactId", { contactId }))
  },
  fare: {
    createEstimate: (payload: ApiPayload) => http.post("/api/v1/public/fare/estimate", payload),
    getHistory: (query?: ApiQuery) => http.get("/api/v1/public/fare/history", { query }),
    getEstimate: (estimateId: string) =>
      http.get(pathWithParams("/api/v1/public/fare/estimates/:estimateId", { estimateId })),
    lockEstimate: (estimateId: string) =>
      http.post(pathWithParams("/api/v1/public/fare/estimates/:estimateId/lock", { estimateId }))
  },
  rideBooking: {
    search: (payload: ApiPayload) => http.post("/api/v1/public/ride-booking/search", payload),
    createBooking: (payload: ApiPayload) => http.post("/api/v1/public/ride-booking/bookings", payload),
    getBooking: (bookingId: string) =>
      http.get(pathWithParams("/api/v1/public/ride-booking/bookings/:bookingId", { bookingId })),
    selectDriver: (bookingId: string, payload: ApiPayload) =>
      http.patch(pathWithParams("/api/v1/public/ride-booking/bookings/:bookingId/driver", { bookingId }), payload),
    confirmBooking: (bookingId: string) =>
      http.post(pathWithParams("/api/v1/public/ride-booking/bookings/:bookingId/confirm", { bookingId })),
    cancelBooking: (bookingId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/public/ride-booking/bookings/:bookingId/cancel", { bookingId }), payload)
  },
  locationSearch: {
    search: (query: ApiQuery) => http.get("/api/v1/public/location-search/search", { query }),
    resolvePlace: (placeId: string, query?: ApiQuery) =>
      http.get(pathWithParams("/api/v1/public/location-search/places/:placeId", { placeId }), { query })
  },
  rides: {
    getCurrent: () => http.get("/api/v1/public/rides/current"),
    getHistory: (query?: ApiQuery) => http.get("/api/v1/public/rides/history", { query }),
    getRide: (rideId: string) => http.get(pathWithParams("/api/v1/public/rides/:rideId", { rideId })),
    getReceipt: (rideId: string) => http.get(pathWithParams("/api/v1/public/rides/:rideId/receipt", { rideId }))
  },
  drivers: {
    list: (query?: ApiQuery) => http.get("/api/v1/public/drivers", { query }),
    getProfile: (driverId: string) => http.get(pathWithParams("/api/v1/public/drivers/:driverId", { driverId })),
    getTrustReport: (driverId: string) =>
      http.get(pathWithParams("/api/v1/public/drivers/:driverId/trust", { driverId })),
    getRouteFairness: (driverId: string) =>
      http.get(pathWithParams("/api/v1/public/drivers/:driverId/route-fairness", { driverId })),
    getCancellationRisk: (driverId: string) =>
      http.get(pathWithParams("/api/v1/public/drivers/:driverId/cancellation-risk", { driverId }))
  },
  payments: {
    listMethods: () => http.get("/api/v1/public/payments/methods"),
    getWallet: () => http.get("/api/v1/public/payments/wallet"),
    getHistory: (query?: ApiQuery) => http.get("/api/v1/public/payments/history", { query }),
    payRide: (rideId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/public/payments/rides/:rideId/pay", { rideId }), payload),
    confirmPaymentSuccess: (paymentId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/public/payments/:paymentId/success", { paymentId }), payload),
    markPaymentFailed: (paymentId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/public/payments/:paymentId/failure", { paymentId }), payload),
    requestRefund: (paymentId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/public/payments/:paymentId/refund", { paymentId }), payload),
    getPayment: (paymentId: string) =>
      http.get(pathWithParams("/api/v1/public/payments/:paymentId", { paymentId }))
  },
  disputes: {
    getOptions: () => http.get("/api/v1/public/disputes/options"),
    getSummary: () => http.get("/api/v1/public/disputes/summary"),
    getHistory: (query?: ApiQuery) => http.get("/api/v1/public/disputes/history", { query }),
    getRideDisputes: (rideId: string) =>
      http.get(pathWithParams("/api/v1/public/disputes/rides/:rideId", { rideId })),
    submitRideDispute: (rideId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/public/disputes/rides/:rideId", { rideId }), payload),
    addEvidence: (disputeId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/public/disputes/:disputeId/evidence", { disputeId }), payload),
    cancelDispute: (disputeId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/public/disputes/:disputeId/cancel", { disputeId }), payload),
    getDispute: (disputeId: string) =>
      http.get(pathWithParams("/api/v1/public/disputes/:disputeId", { disputeId }))
  },
  notifications: {
    getOptions: () => http.get("/api/v1/public/notifications/options"),
    getSummary: () => http.get("/api/v1/public/notifications/summary"),
    getPreferences: () => http.get("/api/v1/public/notifications/preferences"),
    updatePreferences: (payload: ApiPayload) => http.patch("/api/v1/public/notifications/preferences", payload),
    registerDevice: (payload: ApiPayload) => http.post("/api/v1/public/notifications/devices", payload),
    markAllRead: (payload: ApiPayload) => http.patch("/api/v1/public/notifications/read-all", payload),
    list: (query?: ApiQuery) => http.get("/api/v1/public/notifications", { query }),
    markRead: (notificationId: string) =>
      http.patch(pathWithParams("/api/v1/public/notifications/:notificationId/read", { notificationId })),
    archive: (notificationId: string) =>
      http.patch(pathWithParams("/api/v1/public/notifications/:notificationId/archive", { notificationId })),
    getNotification: (notificationId: string) =>
      http.get(pathWithParams("/api/v1/public/notifications/:notificationId", { notificationId }))
  },
  support: {
    getOptions: () => http.get("/api/v1/public/support/options"),
    getFaqs: (query?: ApiQuery) => http.get("/api/v1/public/support/faqs", { query }),
    getFaq: (faqId: string) => http.get(pathWithParams("/api/v1/public/support/faqs/:faqId", { faqId })),
    getSummary: () => http.get("/api/v1/public/support/summary"),
    listTickets: (query?: ApiQuery) => http.get("/api/v1/public/support/tickets", { query }),
    createTicket: (payload: ApiPayload) => http.post("/api/v1/public/support/tickets", payload),
    contact: (payload: ApiPayload) => http.post("/api/v1/public/support/contact", payload),
    addMessage: (ticketId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/public/support/tickets/:ticketId/messages", { ticketId }), payload),
    closeTicket: (ticketId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/public/support/tickets/:ticketId/close", { ticketId }), payload),
    getTicket: (ticketId: string) =>
      http.get(pathWithParams("/api/v1/public/support/tickets/:ticketId", { ticketId }))
  }
});
