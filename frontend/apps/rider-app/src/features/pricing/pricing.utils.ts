import type { BookingHomeForm } from "@/features/booking/booking.types";

export const buildPricingQuotePayload = (form: BookingHomeForm) => ({
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
  requestedAt: new Date().toISOString()
});

export const formatCurrency = (value: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);

export const formatVehicleType = (vehicleType: string | null) =>
  vehicleType
    ? vehicleType
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : "Ride";
