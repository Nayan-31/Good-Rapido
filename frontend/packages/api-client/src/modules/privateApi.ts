import type { HttpClient } from "../shared/httpClient";
import { pathWithParams } from "../shared/path";
import type { ApiPayload, ApiQuery } from "../types";

export const createPrivateApi = (http: HttpClient) => ({
  auth: {
    drivers: {
      registerDriver: (payload: ApiPayload) => http.post("/api/v1/private/auth/drivers/register", payload),
      loginDriver: (payload: ApiPayload) => http.post("/api/v1/private/auth/drivers/login", payload),
      refreshDriver: (payload: ApiPayload) => http.post("/api/v1/private/auth/drivers/refresh", payload),
      logoutDriver: (payload: ApiPayload) => http.post("/api/v1/private/auth/drivers/logout", payload),
      getDriverSession: () => http.get("/api/v1/private/auth/drivers/me")
    },
    admins: {
      login: (payload: ApiPayload) => http.post("/api/v1/private/auth/admins/login", payload),
      refresh: (payload: ApiPayload) => http.post("/api/v1/private/auth/admins/refresh", payload),
      logout: (payload: ApiPayload) => http.post("/api/v1/private/auth/admins/logout", payload),
      me: () => http.get("/api/v1/private/auth/admins/me")
    },
    ops: {
      login: (payload: ApiPayload) => http.post("/api/v1/private/auth/ops/login", payload),
      refresh: (payload: ApiPayload) => http.post("/api/v1/private/auth/ops/refresh", payload),
      logout: (payload: ApiPayload) => http.post("/api/v1/private/auth/ops/logout", payload),
      me: () => http.get("/api/v1/private/auth/ops/me")
    }
  },
  admin: {
    getOptions: () => http.get("/api/v1/private/admin/options"),
    getDashboard: () => http.get("/api/v1/private/admin/dashboard"),
    listUsers: (query?: ApiQuery) => http.get("/api/v1/private/admin/users", { query }),
    createUser: (payload: ApiPayload) => http.post("/api/v1/private/admin/users", payload),
    getUser: (userId: string) => http.get(pathWithParams("/api/v1/private/admin/users/:userId", { userId })),
    updateUser: (userId: string, payload: ApiPayload) =>
      http.patch(pathWithParams("/api/v1/private/admin/users/:userId", { userId }), payload),
    updateUserStatus: (userId: string, payload: ApiPayload) =>
      http.patch(pathWithParams("/api/v1/private/admin/users/:userId/status", { userId }), payload),
    updateUserPermissions: (userId: string, payload: ApiPayload) =>
      http.patch(pathWithParams("/api/v1/private/admin/users/:userId/permissions", { userId }), payload)
  },
  analytics: {
    getOptions: () => http.get("/api/v1/private/analytics/options"),
    getOverview: (query?: ApiQuery) => http.get("/api/v1/private/analytics/overview", { query }),
    getRides: (query?: ApiQuery) => http.get("/api/v1/private/analytics/rides", { query }),
    getRevenue: (query?: ApiQuery) => http.get("/api/v1/private/analytics/revenue", { query }),
    getDrivers: (query?: ApiQuery) => http.get("/api/v1/private/analytics/drivers", { query }),
    getTrustSafety: (query?: ApiQuery) => http.get("/api/v1/private/analytics/trust-safety", { query }),
    forecast: (payload: ApiPayload) => http.post("/api/v1/private/analytics/forecast", payload)
  },
  driver: {
    getOptions: () => http.get("/api/v1/private/driver/options"),
    getProfile: () => http.get("/api/v1/private/driver/profile"),
    updateProfile: (payload: ApiPayload) => http.patch("/api/v1/private/driver/profile", payload),
    getOnboarding: () => http.get("/api/v1/private/driver/onboarding"),
    updateOnboarding: (payload: ApiPayload) => http.patch("/api/v1/private/driver/onboarding", payload),
    submitOnboarding: () => http.post("/api/v1/private/driver/onboarding/submit"),
    getAccount: () => http.get("/api/v1/private/driver/account"),
    updateAccountControls: (payload: ApiPayload) => http.patch("/api/v1/private/driver/account/controls", payload),
    requestDeactivation: (payload: ApiPayload) =>
      http.post("/api/v1/private/driver/account/deactivation-request", payload)
  },
  driverDocuments: {
    getOptions: () => http.get("/api/v1/private/driver-documents/options"),
    getDocuments: () => http.get("/api/v1/private/driver-documents/documents"),
    upsertDocument: (documentType: string, payload: ApiPayload) =>
      http.put(pathWithParams("/api/v1/private/driver-documents/documents/:documentType", { documentType }), payload),
    deleteDocument: (documentType: string) =>
      http.delete(pathWithParams("/api/v1/private/driver-documents/documents/:documentType", { documentType })),
    submitDocuments: () => http.post("/api/v1/private/driver-documents/submit")
  },
  vehicle: {
    getOptions: () => http.get("/api/v1/private/vehicle/options"),
    getVehicles: () => http.get("/api/v1/private/vehicle/vehicles"),
    createVehicle: (payload: ApiPayload) => http.post("/api/v1/private/vehicle/vehicles", payload),
    updateVehicle: (vehicleId: string, payload: ApiPayload) =>
      http.patch(pathWithParams("/api/v1/private/vehicle/vehicles/:vehicleId", { vehicleId }), payload),
    deleteVehicle: (vehicleId: string) =>
      http.delete(pathWithParams("/api/v1/private/vehicle/vehicles/:vehicleId", { vehicleId })),
    setPrimaryVehicle: (vehicleId: string) =>
      http.patch(pathWithParams("/api/v1/private/vehicle/vehicles/:vehicleId/primary", { vehicleId })),
    submitVehicle: (vehicleId: string) =>
      http.post(pathWithParams("/api/v1/private/vehicle/vehicles/:vehicleId/submit", { vehicleId }))
  },
  availability: {
    getOptions: () => http.get("/api/v1/private/driver-availability/options"),
    getStatus: () => http.get("/api/v1/private/driver-availability/status"),
    updateStatus: (payload: ApiPayload) => http.patch("/api/v1/private/driver-availability/status", payload),
    updateLocation: (payload: ApiPayload) => http.patch("/api/v1/private/driver-availability/location", payload),
    updateZones: (payload: ApiPayload) => http.patch("/api/v1/private/driver-availability/zones", payload)
  },
  rideOps: {
    getOptions: () => http.get("/api/v1/private/ride-ops/options"),
    getDashboard: () => http.get("/api/v1/private/ride-ops/dashboard"),
    listRides: (query?: ApiQuery) => http.get("/api/v1/private/ride-ops/rides", { query }),
    getRide: (rideId: string) => http.get(pathWithParams("/api/v1/private/ride-ops/rides/:rideId", { rideId })),
    updateOpsState: (rideId: string, payload: ApiPayload) =>
      http.patch(pathWithParams("/api/v1/private/ride-ops/rides/:rideId/ops-state", { rideId }), payload),
    confirmRide: (rideId: string, payload?: ApiPayload) =>
      http.post(pathWithParams("/api/v1/private/ride-ops/rides/:rideId/confirm", { rideId }), payload),
    reassignDriver: (rideId: string, payload: ApiPayload) =>
      http.patch(pathWithParams("/api/v1/private/ride-ops/rides/:rideId/driver", { rideId }), payload),
    cancelRide: (rideId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/private/ride-ops/rides/:rideId/cancel", { rideId }), payload)
  },
  earnings: {
    getOptions: () => http.get("/api/v1/private/earnings/options"),
    getSummary: (query?: ApiQuery) => http.get("/api/v1/private/earnings/summary", { query }),
    listRides: (query?: ApiQuery) => http.get("/api/v1/private/earnings/rides", { query }),
    getRide: (rideId: string) => http.get(pathWithParams("/api/v1/private/earnings/rides/:rideId", { rideId })),
    getStatements: (query?: ApiQuery) => http.get("/api/v1/private/earnings/statements", { query }),
    simulate: (payload: ApiPayload) => http.post("/api/v1/private/earnings/simulate", payload)
  },
  pricing: {
    getOptions: () => http.get("/api/v1/private/pricing/options"),
    getDashboard: () => http.get("/api/v1/private/pricing/dashboard"),
    listRules: (query?: ApiQuery) => http.get("/api/v1/private/pricing/rules", { query }),
    createRule: (payload: ApiPayload) => http.post("/api/v1/private/pricing/rules", payload),
    simulate: (payload: ApiPayload) => http.post("/api/v1/private/pricing/simulate", payload),
    getRule: (ruleId: string) => http.get(pathWithParams("/api/v1/private/pricing/rules/:ruleId", { ruleId })),
    updateRule: (ruleId: string, payload: ApiPayload) =>
      http.patch(pathWithParams("/api/v1/private/pricing/rules/:ruleId", { ruleId }), payload),
    activateRule: (ruleId: string) =>
      http.post(pathWithParams("/api/v1/private/pricing/rules/:ruleId/activate", { ruleId })),
    archiveRule: (ruleId: string) =>
      http.post(pathWithParams("/api/v1/private/pricing/rules/:ruleId/archive", { ruleId }))
  },
  surge: {
    getOptions: () => http.get("/api/v1/private/surge/options"),
    getDashboard: () => http.get("/api/v1/private/surge/dashboard"),
    listRules: (query?: ApiQuery) => http.get("/api/v1/private/surge/rules", { query }),
    createRule: (payload: ApiPayload) => http.post("/api/v1/private/surge/rules", payload),
    simulate: (payload: ApiPayload) => http.post("/api/v1/private/surge/simulate", payload),
    getRule: (ruleId: string) => http.get(pathWithParams("/api/v1/private/surge/rules/:ruleId", { ruleId })),
    updateRule: (ruleId: string, payload: ApiPayload) =>
      http.patch(pathWithParams("/api/v1/private/surge/rules/:ruleId", { ruleId }), payload),
    activateRule: (ruleId: string) =>
      http.post(pathWithParams("/api/v1/private/surge/rules/:ruleId/activate", { ruleId })),
    pauseRule: (ruleId: string) =>
      http.post(pathWithParams("/api/v1/private/surge/rules/:ruleId/pause", { ruleId })),
    endRule: (ruleId: string) =>
      http.post(pathWithParams("/api/v1/private/surge/rules/:ruleId/end", { ruleId })),
    archiveRule: (ruleId: string) =>
      http.post(pathWithParams("/api/v1/private/surge/rules/:ruleId/archive", { ruleId }))
  },
  trust: {
    getOptions: () => http.get("/api/v1/private/trust/options"),
    getDashboard: () => http.get("/api/v1/private/trust/dashboard"),
    listProfiles: (query?: ApiQuery) => http.get("/api/v1/private/trust/profiles", { query }),
    createProfile: (payload: ApiPayload) => http.post("/api/v1/private/trust/profiles", payload),
    simulate: (payload: ApiPayload) => http.post("/api/v1/private/trust/simulate", payload),
    getProfile: (profileId: string) =>
      http.get(pathWithParams("/api/v1/private/trust/profiles/:profileId", { profileId })),
    updateProfile: (profileId: string, payload: ApiPayload) =>
      http.patch(pathWithParams("/api/v1/private/trust/profiles/:profileId", { profileId }), payload),
    assignReviewer: (profileId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/private/trust/profiles/:profileId/assign", { profileId }), payload),
    addNote: (profileId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/private/trust/profiles/:profileId/notes", { profileId }), payload),
    resolveReview: (profileId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/private/trust/profiles/:profileId/resolve", { profileId }), payload)
  },
  fraud: {
    getOptions: () => http.get("/api/v1/private/fraud/options"),
    getDashboard: () => http.get("/api/v1/private/fraud/dashboard"),
    listCases: (query?: ApiQuery) => http.get("/api/v1/private/fraud/cases", { query }),
    createCase: (payload: ApiPayload) => http.post("/api/v1/private/fraud/cases", payload),
    simulate: (payload: ApiPayload) => http.post("/api/v1/private/fraud/simulate", payload),
    getCase: (caseId: string) => http.get(pathWithParams("/api/v1/private/fraud/cases/:caseId", { caseId })),
    updateCase: (caseId: string, payload: ApiPayload) =>
      http.patch(pathWithParams("/api/v1/private/fraud/cases/:caseId", { caseId }), payload),
    assignReviewer: (caseId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/private/fraud/cases/:caseId/assign", { caseId }), payload),
    addNote: (caseId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/private/fraud/cases/:caseId/notes", { caseId }), payload),
    confirmCase: (caseId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/private/fraud/cases/:caseId/confirm", { caseId }), payload),
    dismissCase: (caseId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/private/fraud/cases/:caseId/dismiss", { caseId }), payload),
    resolveCase: (caseId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/private/fraud/cases/:caseId/resolve", { caseId }), payload)
  },
  notifications: {
    getOptions: () => http.get("/api/v1/private/notifications/options"),
    getDashboard: () => http.get("/api/v1/private/notifications/dashboard"),
    list: (query?: ApiQuery) => http.get("/api/v1/private/notifications/notifications", { query }),
    create: (payload: ApiPayload) => http.post("/api/v1/private/notifications/notifications", payload),
    getNotification: (notificationId: string) =>
      http.get(pathWithParams("/api/v1/private/notifications/notifications/:notificationId", { notificationId })),
    send: (notificationId: string) =>
      http.post(pathWithParams("/api/v1/private/notifications/notifications/:notificationId/send", { notificationId })),
    fail: (notificationId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/private/notifications/notifications/:notificationId/fail", { notificationId }), payload),
    retry: (notificationId: string) =>
      http.post(pathWithParams("/api/v1/private/notifications/notifications/:notificationId/retry", { notificationId })),
    cancel: (notificationId: string, payload?: ApiPayload) =>
      http.post(pathWithParams("/api/v1/private/notifications/notifications/:notificationId/cancel", { notificationId }), payload)
  },
  disputes: {
    getOptions: () => http.get("/api/v1/private/disputes/options"),
    getDashboard: () => http.get("/api/v1/private/disputes/dashboard"),
    getQueue: (query?: ApiQuery) => http.get("/api/v1/private/disputes/queue", { query }),
    getDispute: (disputeId: string) =>
      http.get(pathWithParams("/api/v1/private/disputes/:disputeId", { disputeId })),
    updateState: (disputeId: string, payload: ApiPayload) =>
      http.patch(pathWithParams("/api/v1/private/disputes/:disputeId", { disputeId }), payload),
    assign: (disputeId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/private/disputes/:disputeId/assign", { disputeId }), payload),
    requestEvidence: (disputeId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/private/disputes/:disputeId/request-evidence", { disputeId }), payload),
    addNote: (disputeId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/private/disputes/:disputeId/notes", { disputeId }), payload),
    resolve: (disputeId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/private/disputes/:disputeId/resolve", { disputeId }), payload),
    reject: (disputeId: string, payload: ApiPayload) =>
      http.post(pathWithParams("/api/v1/private/disputes/:disputeId/reject", { disputeId }), payload)
  }
});
