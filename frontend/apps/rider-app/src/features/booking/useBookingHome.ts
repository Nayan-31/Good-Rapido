import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiClientError } from "@good-rapido/api-client";
import type { PricingQuote } from "@/features/pricing/pricing.types";
import { DEFAULT_BOOKING_FORM, VEHICLE_OPTIONS } from "./booking.constants";
import { bookingService } from "./booking.service";
import { resolveKnownLocationPatch } from "./locationPresets";
import { rideFlowStorage } from "./rideFlowStorage";
import type { BookingHomeErrors, BookingHomeForm, BookingLocationForm, FareEstimate, VehicleType } from "./booking.types";
import { hasBookingHomeErrors, validateBookingHomeForm } from "./booking.utils";

type VehicleQuoteMap = Partial<Record<VehicleType, PricingQuote>>;

export function useBookingHome() {
  const [form, setForm] = useState<BookingHomeForm>(DEFAULT_BOOKING_FORM);
  const [errors, setErrors] = useState<BookingHomeErrors>({});
  const [estimate, setEstimate] = useState<FareEstimate | null>(null);
  const [vehicleQuotes, setVehicleQuotes] = useState<VehicleQuoteMap>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isLoadingVehicleQuotes, setIsLoadingVehicleQuotes] = useState(false);

  const updateLocation = useCallback((kind: "pickup" | "dropoff", patch: Partial<BookingLocationForm>) => {
    const isAddressOnlyPatch = patch.address !== undefined
      && patch.latitude === undefined
      && patch.longitude === undefined;
    const knownLocationPatch = isAddressOnlyPatch
      ? resolveKnownLocationPatch(patch.address ?? "")
      : null;

    setForm((currentForm) => ({
      ...currentForm,
      [kind]: {
        ...currentForm[kind],
        ...patch,
        ...(knownLocationPatch ?? (isAddressOnlyPatch ? { latitude: "", longitude: "" } : {}))
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

  const vehicleTypes = useMemo(() => VEHICLE_OPTIONS.map((vehicle) => vehicle.type), []);

  const loadVehicleQuotes = useCallback(async () => {
    const nextErrors = validateBookingHomeForm(form);

    if (hasBookingHomeErrors(nextErrors)) {
      setVehicleQuotes({});
      return;
    }

    setIsLoadingVehicleQuotes(true);

    try {
      const response = await bookingService.compareVehicleOptions(form, vehicleTypes);
      const quotes = response.data?.comparison.quotes ?? [];
      const quoteMap = quotes.reduce<VehicleQuoteMap>((map, quote) => {
        if (quote.vehicleType) {
          map[quote.vehicleType] = quote;
        }

        return map;
      }, {});

      setVehicleQuotes(quoteMap);
    } catch {
      setVehicleQuotes({});
    } finally {
      setIsLoadingVehicleQuotes(false);
    }
  }, [form, vehicleTypes]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadVehicleQuotes();
    }, 350);

    return () => window.clearTimeout(timerId);
  }, [loadVehicleQuotes]);

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
    vehicleQuotes,
    message,
    isEstimating,
    isLoadingVehicleQuotes,
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
