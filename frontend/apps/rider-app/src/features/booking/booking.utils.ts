import type { BookingHomeErrors, BookingHomeForm, BookingLocationForm } from "./booking.types";

export const validateBookingHomeForm = (form: BookingHomeForm): BookingHomeErrors => {
  const errors: BookingHomeErrors = {};
  const pickupErrors = validateLocation(form.pickup);
  const dropoffErrors = validateLocation(form.dropoff);
  const passengers = Number(form.passengers);

  if (Object.keys(pickupErrors).length) {
    errors.pickup = pickupErrors;
  }

  if (Object.keys(dropoffErrors).length) {
    errors.dropoff = dropoffErrors;
  }

  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 6) {
    errors.passengers = "Passengers must be between 1 and 6";
  }

  if (
    !errors.pickup &&
    !errors.dropoff &&
    Number(form.pickup.latitude) === Number(form.dropoff.latitude) &&
    Number(form.pickup.longitude) === Number(form.dropoff.longitude)
  ) {
    errors.dropoff = {
      latitude: "Pickup and dropoff must be different",
      longitude: "Pickup and dropoff must be different"
    };
  }

  return errors;
};

export const hasBookingHomeErrors = (errors: BookingHomeErrors) =>
  Boolean(errors.passengers || errors.pickup || errors.dropoff);

export const buildFareEstimatePayload = (form: BookingHomeForm) => ({
  pickup: toLocationPayload(form.pickup),
  dropoff: toLocationPayload(form.dropoff),
  vehicleType: form.vehicleType,
  passengers: Number(form.passengers),
  requestedAt: new Date().toISOString()
});

export const formatCurrency = (value: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);

const validateLocation = (location: BookingLocationForm) => {
  const errors: Partial<Record<keyof BookingLocationForm, string>> = {};
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    errors.latitude = "Enter latitude from -90 to 90";
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    errors.longitude = "Enter longitude from -180 to 180";
  }

  return errors;
};

const toLocationPayload = (location: BookingLocationForm) => ({
  address: location.address.trim() || undefined,
  latitude: Number(location.latitude),
  longitude: Number(location.longitude)
});
