import { apiClient } from "@/services/apiClient";
import type { RideBookingResponse, RideLifecycleResponse } from "./confirmRide.types";

export const confirmRideService = {
  createBooking(fareEstimateId: string, selectedDriverId: string) {
    return apiClient.public.rideBooking.createBooking({
      fareEstimateId,
      selectedDriverId,
      paymentMethod: "personal_wallet"
    }) as Promise<RideBookingResponse>;
  },
  confirmBooking(bookingId: string) {
    return apiClient.public.rideBooking.confirmBooking(bookingId) as Promise<RideBookingResponse>;
  },
  getLifecycle(rideId: string) {
    return apiClient.core.rideLifecycle.getRideLifecycle(rideId) as Promise<RideLifecycleResponse>;
  }
};
