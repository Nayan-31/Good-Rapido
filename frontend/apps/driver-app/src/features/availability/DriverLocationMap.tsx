import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  loadGoogleMaps,
  type GoogleCircle,
  type GoogleLatLngLiteral,
  type GoogleMap,
  type GoogleMarker
} from "@/components/maps/googleMaps";
import { configureLeafletIcons, loadLeaflet, type LeafletMap } from "@/components/maps/leaflet";
import styles from "./AvailabilityScreen.module.css";

const DEFAULT_ZOOM = 15;

interface DriverLocationMapProps {
  latitude: number | null;
  longitude: number | null;
  accuracyMeters?: number | null;
  isFresh?: boolean;
  label?: string | null;
}

interface ProviderMapProps extends DriverLocationMapProps {
  hasCoordinates: boolean;
  providerName: string;
}

export function DriverLocationMap(props: DriverLocationMapProps) {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? "";
  const hasCoordinates = Number.isFinite(props.latitude) && Number.isFinite(props.longitude);

  if (googleMapsApiKey) {
    return (
      <GoogleDriverLocationMap
        {...props}
        apiKey={googleMapsApiKey}
        hasCoordinates={hasCoordinates}
        providerName="Google Maps"
      />
    );
  }

  return (
    <LeafletDriverLocationMap
      {...props}
      hasCoordinates={hasCoordinates}
      providerName="Leaflet + OpenStreetMap"
    />
  );
}

function GoogleDriverLocationMap({
  apiKey,
  latitude,
  longitude,
  accuracyMeters,
  hasCoordinates,
  isFresh = false,
  label,
  providerName
}: ProviderMapProps & { apiKey: string }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<GoogleMap | null>(null);
  const markerRef = useRef<GoogleMarker | null>(null);
  const circleRef = useRef<GoogleCircle | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "ready" | "failed">("idle");

  useEffect(() => {
    if (!mapRef.current || !hasCoordinates || latitude === null || longitude === null) {
      return;
    }

    let disposed = false;

    void loadGoogleMaps(apiKey)
      .then((google) => {
        if (disposed || !mapRef.current) {
          return;
        }

        setLoadState("ready");
        const position: GoogleLatLngLiteral = { lat: latitude, lng: longitude };
        const map = new google.maps.Map(mapRef.current, {
          center: position,
          clickableIcons: false,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          zoom: DEFAULT_ZOOM
        });

        mapInstanceRef.current = map;
        markerRef.current = new google.maps.Marker({
          icon: {
            fillColor: isFresh ? "#00856f" : "#d97706",
            fillOpacity: 1,
            path: google.maps.SymbolPath.CIRCLE,
            scale: 15,
            strokeColor: "#ffffff",
            strokeWeight: 3
          },
          label: {
            color: "#ffffff",
            fontSize: "11px",
            fontWeight: "800",
            text: "GPS"
          },
          map,
          position,
          title: label || "Driver current location"
        });
        circleRef.current = new google.maps.Circle({
          center: position,
          fillColor: isFresh ? "#63ebd5" : "#fbbf24",
          fillOpacity: 0.18,
          map,
          radius: Math.max(accuracyMeters ?? 24, 18),
          strokeColor: isFresh ? "#00856f" : "#d97706",
          strokeOpacity: 0.8,
          strokeWeight: 2
        });
      })
      .catch(() => setLoadState("failed"));

    return () => {
      disposed = true;
      markerRef.current?.setMap(null);
      circleRef.current?.setMap(null);
      mapInstanceRef.current = null;
    };
  }, [accuracyMeters, apiKey, hasCoordinates, isFresh, label, latitude, longitude]);

  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || latitude === null || longitude === null) {
      return;
    }

    const position = { lat: latitude, lng: longitude };
    mapInstanceRef.current.setCenter(position);
    markerRef.current.setPosition(position);
    circleRef.current?.setCenter(position);
    circleRef.current?.setRadius(Math.max(accuracyMeters ?? 24, 18));
  }, [accuracyMeters, latitude, longitude]);

  return (
    <MapShell
      accuracyMeters={accuracyMeters}
      hasCoordinates={hasCoordinates}
      isFresh={isFresh}
      latitude={latitude}
      loadState={loadState}
      longitude={longitude}
      providerName={providerName}
    >
      <div className={styles.liveMapCanvas} ref={mapRef}>
        {loadState === "failed" ? (
          <div className={styles.liveMapFallback}>
            Google Maps could not load. Check `VITE_GOOGLE_MAPS_API_KEY` and Google Cloud billing.
          </div>
        ) : null}
      </div>
    </MapShell>
  );
}

function LeafletDriverLocationMap({
  latitude,
  longitude,
  accuracyMeters,
  hasCoordinates,
  isFresh = false,
  label,
  providerName
}: ProviderMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "ready" | "failed">("idle");

  useEffect(() => {
    if (!mapRef.current || !hasCoordinates || latitude === null || longitude === null) {
      return;
    }

    let map: LeafletMap | null = null;
    let disposed = false;

    void loadLeaflet()
      .then((leaflet) => {
        if (disposed || !mapRef.current) {
          return;
        }

        setLoadState("ready");
        configureLeafletIcons(leaflet);

        map = leaflet.map(mapRef.current, {
          attributionControl: true,
          zoomControl: true,
          scrollWheelZoom: false
        }).setView([latitude, longitude], DEFAULT_ZOOM);

        leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);

        leaflet
          .circle([latitude, longitude], {
            radius: Math.max(accuracyMeters ?? 24, 18),
            color: isFresh ? "#00856f" : "#d97706",
            fillColor: isFresh ? "#63ebd5" : "#fbbf24",
            fillOpacity: 0.18,
            weight: 2
          })
          .addTo(map);

        leaflet
          .marker([latitude, longitude])
          .addTo(map)
          .bindPopup?.(label || "Driver current location");
      })
      .catch(() => setLoadState("failed"));

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [accuracyMeters, hasCoordinates, isFresh, label, latitude, longitude]);

  return (
    <MapShell
      accuracyMeters={accuracyMeters}
      hasCoordinates={hasCoordinates}
      isFresh={isFresh}
      latitude={latitude}
      loadState={loadState}
      longitude={longitude}
      providerName={providerName}
    >
      <div className={styles.liveMapCanvas} ref={mapRef}>
        {loadState === "failed" ? (
          <div className={styles.liveMapFallback}>
            Map provider could not load. GPS coordinates are still ready to share.
          </div>
        ) : null}
      </div>
    </MapShell>
  );
}

function MapShell({
  accuracyMeters,
  children,
  hasCoordinates,
  isFresh,
  latitude,
  loadState,
  longitude,
  providerName
}: {
  accuracyMeters?: number | null;
  children: ReactNode;
  hasCoordinates: boolean;
  isFresh: boolean;
  latitude: number | null;
  loadState: "idle" | "ready" | "failed";
  longitude: number | null;
  providerName: string;
}) {
  return (
    <div className={styles.liveMapShell}>
      <div className={styles.liveMapHeader}>
        <div>
          <span className={styles.eyebrow}>Live map provider</span>
          <strong>{providerName}</strong>
        </div>
        <span data-fresh={isFresh}>{loadState === "failed" ? "Provider issue" : isFresh ? "Fresh GPS" : "Needs sync"}</span>
      </div>

      {hasCoordinates ? children : (
        <div className={styles.liveMapEmpty}>Enable GPS sharing to show your current driver location.</div>
      )}

      {hasCoordinates ? (
        <div className={styles.coordinateGrid}>
          <span>Lat {latitude?.toFixed(5)}</span>
          <span>Lng {longitude?.toFixed(5)}</span>
          <span>Accuracy {Math.round(accuracyMeters ?? 0)}m</span>
        </div>
      ) : null}
    </div>
  );
}
