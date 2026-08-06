import { apiClient, getValidRiderAccessToken, riderApiBaseUrl } from "@/services/apiClient";
import type { RideBookingResponse, RideLifecycleResponse, RideLifecycleStreamPayload, RideLifecycleView } from "./confirmRide.types";

interface RideLifecycleStreamOptions {
  signal?: AbortSignal;
  onLifecycle: (lifecycle: RideLifecycleView) => void;
  onOpen?: () => void;
  onError?: (message: string) => void;
}

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
  },
  async streamLifecycle(rideId: string, options: RideLifecycleStreamOptions) {
    const accessToken = await getValidRiderAccessToken();

    if (!accessToken) {
      throw new Error("Access token is required");
    }

    const response = await fetch(`${riderApiBaseUrl}/api/v1/core/ride-lifecycle/rides/${encodeURIComponent(rideId)}/stream`, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer ${accessToken}`
      },
      credentials: "include",
      signal: options.signal
    });

    if (!response.ok || !response.body) {
      throw new Error(response.statusText || "Ride lifecycle stream failed");
    }

    options.onOpen?.();

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\n\n/);
      buffer = events.pop() ?? "";

      events.forEach((eventText) => handleStreamEvent(eventText, options));
    }

    if (buffer.trim()) {
      handleStreamEvent(buffer, options);
    }
  }
};

const handleStreamEvent = (eventText: string, options: RideLifecycleStreamOptions) => {
  const event = parseStreamEvent(eventText);

  if (!event.data) {
    return;
  }

  if (event.event === "ride_error") {
    options.onError?.(readStreamError(event.data));
    return;
  }

  if (event.event !== "ride_status" && event.event !== "ride_closed") {
    return;
  }

  try {
    const payload = JSON.parse(event.data) as RideLifecycleStreamPayload;

    if (payload.lifecycle) {
      options.onLifecycle(payload.lifecycle);
    }
  } catch {
    options.onError?.("Unable to parse live ride update");
  }
};

const parseStreamEvent = (eventText: string) => {
  return eventText.split(/\n/).reduce<{ event: string; data: string }>((event, line) => {
    if (line.startsWith("event:")) {
      event.event = line.replace("event:", "").trim();
    }

    if (line.startsWith("data:")) {
      event.data = `${event.data}${event.data ? "\n" : ""}${line.replace("data:", "").trim()}`;
    }

    return event;
  }, { event: "message", data: "" });
};

const readStreamError = (data: string) => {
  try {
    const payload = JSON.parse(data) as { message?: string };

    return payload.message || "Ride lifecycle stream failed";
  } catch {
    return "Ride lifecycle stream failed";
  }
};
