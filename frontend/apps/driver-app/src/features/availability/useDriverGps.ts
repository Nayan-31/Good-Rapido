import { useCallback, useEffect, useMemo, useState } from "react";

import type { DriverLocationForm } from "./availability.types";

const GPS_TIMEOUT_MS = 15000;
const GPS_MAX_AGE_MS = 10000;

export type DriverGpsPermission = PermissionState | "unsupported" | "unknown";

export function useDriverGps() {
  const isSupported = typeof navigator !== "undefined" && "geolocation" in navigator;
  const [permissionState, setPermissionState] = useState<DriverGpsPermission>(
    isSupported ? "unknown" : "unsupported"
  );
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [lastGpsAt, setLastGpsAt] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupported || !navigator.permissions?.query) {
      return;
    }

    let permissionStatus: PermissionStatus | null = null;
    let disposed = false;

    void navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (disposed) {
          return;
        }

        permissionStatus = status;
        setPermissionState(status.state);
        status.onchange = () => setPermissionState(status.state);
      })
      .catch(() => setPermissionState("unknown"));

    return () => {
      disposed = true;

      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [isSupported]);

  const getCurrentLocation = useCallback(() => {
    if (!isSupported) {
      setGpsError("GPS is not supported in this browser.");
      return Promise.reject(new Error("GPS is not supported in this browser."));
    }

    setIsLocating(true);
    setGpsError(null);

    return new Promise<DriverLocationForm>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextLocation = toLocationForm(position);
          setLastGpsAt(nextLocation.capturedAt ?? new Date().toISOString());
          setIsLocating(false);
          setGpsError(null);
          resolve(nextLocation);
        },
        (error) => {
          const message = resolveGpsError(error);
          setGpsError(message);
          setIsLocating(false);
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          maximumAge: GPS_MAX_AGE_MS,
          timeout: GPS_TIMEOUT_MS
        }
      );
    });
  }, [isSupported]);

  return useMemo(
    () => ({
      isSupported,
      permissionState,
      isLocating,
      gpsError,
      lastGpsAt,
      getCurrentLocation
    }),
    [getCurrentLocation, gpsError, isLocating, isSupported, lastGpsAt, permissionState]
  );
}

const toLocationForm = (position: GeolocationPosition): DriverLocationForm => {
  const { coords } = position;
  const capturedAt = new Date(position.timestamp || Date.now()).toISOString();

  return {
    latitude: coords.latitude.toFixed(6),
    longitude: coords.longitude.toFixed(6),
    accuracyMeters: Math.round(coords.accuracy).toString(),
    addressLabel: "Current GPS location",
    headingDegrees: Number.isFinite(coords.heading) ? String(Math.round(coords.heading ?? 0)) : undefined,
    speedKmph: Number.isFinite(coords.speed) ? String(Math.max(0, Math.round((coords.speed ?? 0) * 3.6))) : undefined,
    source: "gps",
    capturedAt
  };
};

const resolveGpsError = (error: GeolocationPositionError) => {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission denied. Enable browser location access and try again.";
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Current GPS location is unavailable. Check device location services.";
  }

  if (error.code === error.TIMEOUT) {
    return "GPS request timed out. Move to a stronger signal area and retry.";
  }

  return error.message || "Unable to read GPS location.";
};
