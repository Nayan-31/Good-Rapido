import { useCallback, useState } from "react";

import { ApiClientError } from "@good-rapido/api-client";
import { DEFAULT_BOOKING_FORM } from "./booking.constants";
import { bookingService } from "./booking.service";
import { rideFlowStorage } from "./rideFlowStorage";
import type { BookingHomeErrors, BookingHomeForm, BookingLocationForm, FareEstimate, VehicleType } from "./booking.types";
import { hasBookingHomeErrors, validateBookingHomeForm } from "./booking.utils";

export function useBookingHome() {
  const [form, setForm] = useState<BookingHomeForm>(DEFAULT_BOOKING_FORM);
  const [errors, setErrors] = useState<BookingHomeErrors>({});
  const [estimate, setEstimate] = useState<FareEstimate | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  const updateLocation = useCallback((kind: "pickup" | "dropoff", patch: Partial<BookingLocationForm>) => {
    setForm((currentForm) => ({
      ...currentForm,
      [kind]: {
        ...currentForm[kind],
        ...patch
      }
    }));
  }, []);

  const selectVehicle = useCallback((vehicleType: VehicleType) => {
    setForm((currentForm) => ({
      ...currentForm,
      vehicleType
    }));
  }, []);

  const updatePassengers = useCallback((passengers: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      passengers
    }));
  }, []);

  const createEstimate = useCallback(async () => {
    const nextErrors = validateBookingHomeForm(form);
    setErrors(nextErrors);
    setMessage(null);

    if (hasBookingHomeErrors(nextErrors)) {
      return;
    }

    setIsEstimating(true);

    try {
      const response = await bookingService.createFareEstimate(form);
      const nextEstimate = response.data?.estimate ?? null;

      setEstimate(nextEstimate);
      setMessage(response.message);

      if (nextEstimate) {
        rideFlowStorage.save({
          form,
          fareEstimate: nextEstimate,
          updatedAt: new Date().toISOString()
        });
        window.location.hash = "/estimate";
      }
    } catch (error) {
      setMessage(resolveErrorMessage(error));
    } finally {
      setIsEstimating(false);
    }
  }, [form]);

  return {
    form,
    errors,
    estimate,
    message,
    isEstimating,
    updateLocation,
    selectVehicle,
    updatePassengers,
    createEstimate
  };
}

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return "Fare estimate request failed";
};
