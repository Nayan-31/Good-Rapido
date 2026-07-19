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
    }
  },
  driver: {
    getOptions: () => http.get("/api/v1/private/driver/options"),
    getProfile: () => http.get("/api/v1/private/driver/profile"),
    updateProfile: (payload: ApiPayload) => http.patch("/api/v1/private/driver/profile", payload),
    getOnboarding: () => http.get("/api/v1/private/driver/onboarding"),
    updateOnboarding: (payload: ApiPayload) => http.patch("/api/v1/private/driver/onboarding", payload),
    submitOnboarding: () => http.post("/api/v1/private/driver/onboarding/submit"),
    getAccount: () => http.get("/api/v1/private/driver/account"),
    updateAccountControls: (payload: ApiPayload) => http.patch("/api/v1/private/driver/account/controls", payload)
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
  }
});
