import type { BookingHomeForm } from "@/features/booking/booking.types";

export const buildMatchingPayload = (form: BookingHomeForm) => ({
  pickup: {
    address: form.pickup.address.trim() || undefined,
    latitude: Number(form.pickup.latitude),
    longitude: Number(form.pickup.longitude)
  },
  dropoff: {
    address: form.dropoff.address.trim() || undefined,
    latitude: Number(form.dropoff.latitude),
    longitude: Number(form.dropoff.longitude)
  },
  vehicleType: form.vehicleType,
  serviceZone: "default",
  limit: 3
});
