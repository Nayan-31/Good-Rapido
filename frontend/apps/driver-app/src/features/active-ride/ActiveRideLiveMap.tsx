import { useEffect, useMemo, useRef, useState } from "react";

import { Badge, Button, ProgressBar } from "@good-rapido/ui";
import {
  loadGoogleMaps,
  type GoogleCircle,
  type GoogleDirectionsRenderer,
  type GoogleDirectionsService,
  type GoogleLatLngLiteral,
  type GoogleMap,
  type GoogleMarker,
  type GoogleMapsNamespace,
  type GooglePolyline
} from "@/components/maps/googleMaps";
import {
  configureLeafletIcons,
  loadLeaflet,
  type LeafletCircle,
  type LeafletLatLng,
  type LeafletMap,
  type LeafletMarker,
  type LeafletNamespace,
  type LeafletPolyline
} from "@/components/maps/leaflet";
import type { DriverActiveRideSnapshot, DriverRideLifecycleStatus, DriverRideLocation } from "@/features/ride-requests/rideRequest.types";
import type { DriverLiveLocation } from "./activeRide.types";
import styles from "./ActiveRideScreen.module.css";

interface ActiveRideLiveMapProps {
  ride: DriverActiveRideSnapshot;
  driverLocation: DriverLiveLocation | null;
  isLocationTracking: boolean;
  onStartTracking: () => void;
  onStopTracking: () => void;
}

interface ResolvedMapState {
  activeRoute: {
    start: LeafletLatLng;
    end: LeafletLatLng;
  };
  driverCoordinate: LeafletLatLng;
  dropoffCoordinate: LeafletLatLng;
  pickupCoordinate: LeafletLatLng;
  routeKey: string;
}

const DEFAULT_ZOOM = 14;
const ROUTE_REFRESH_PRECISION = 4;

export function ActiveRideLiveMap(props: ActiveRideLiveMapProps) {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? "";
  const mapState = useResolvedMapState(props.ride, props.driverLocation);

  if (googleMapsApiKey) {
    return (
      <GoogleActiveRideMap
        {...props}
        apiKey={googleMapsApiKey}
        mapState={mapState}
      />
    );
  }

  return <LeafletActiveRideMap {...props} mapState={mapState} />;
}

function GoogleActiveRideMap({
  apiKey,
  ride,
  driverLocation,
  isLocationTracking,
  onStartTracking,
  onStopTracking,
  mapState
}: ActiveRideLiveMapProps & { apiKey: string; mapState: ResolvedMapState }) {
  const [loadState, setLoadState] = useState<"idle" | "ready" | "failed">("idle");
  const mapRef = useRef<HTMLDivElement | null>(null);
  const googleRef = useRef<GoogleMapsNamespace | null>(null);
  const mapInstanceRef = useRef<GoogleMap | null>(null);
  const driverMarkerRef = useRef<GoogleMarker | null>(null);
  const pickupMarkerRef = useRef<GoogleMarker | null>(null);
  const dropoffMarkerRef = useRef<GoogleMarker | null>(null);
  const directionsRendererRef = useRef<GoogleDirectionsRenderer | null>(null);
  const directionsServiceRef = useRef<GoogleDirectionsService | null>(null);
  const fallbackPolylineRef = useRef<GooglePolyline | null>(null);
  const accuracyCircleRef = useRef<GoogleCircle | null>(null);

  useEffect(() => {
    let disposed = false;

    if (!mapRef.current) {
      return;
    }

    void loadGoogleMaps(apiKey)
      .then((google) => {
        if (disposed || !mapRef.current) {
          return;
        }

        setLoadState("ready");
        googleRef.current = google;

        const map = new google.maps.Map(mapRef.current, {
          center: toGoogleLatLng(mapState.driverCoordinate),
          clickableIcons: false,
          disableDefaultUI: false,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          zoom: DEFAULT_ZOOM
        });

        mapInstanceRef.current = map;
        directionsServiceRef.current = new google.maps.DirectionsService();
        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          map,
          preserveViewport: true,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: ride.lifecycleStatus === "driver_en_route" ? "#00856f" : "#06243b",
            strokeOpacity: 0.92,
            strokeWeight: 6
          }
        });
      })
      .catch(() => setLoadState("failed"));

    return () => {
      disposed = true;
      driverMarkerRef.current?.setMap(null);
      pickupMarkerRef.current?.setMap(null);
      dropoffMarkerRef.current?.setMap(null);
      directionsRendererRef.current?.setMap(null);
      fallbackPolylineRef.current?.setMap(null);
      accuracyCircleRef.current?.setMap(null);
      directionsRendererRef.current = null;
      directionsServiceRef.current = null;
      mapInstanceRef.current = null;
      googleRef.current = null;
    };
  }, [apiKey]);

  useEffect(() => {
    const google = googleRef.current;
    const map = mapInstanceRef.current;

    if (!google || !map) {
      return;
    }

    const driverPosition = toGoogleLatLng(mapState.driverCoordinate);
    const pickupPosition = toGoogleLatLng(mapState.pickupCoordinate);
    const dropoffPosition = toGoogleLatLng(mapState.dropoffCoordinate);

    driverMarkerRef.current = updateGoogleMarker({
      color: "#00856f",
      currentMarker: driverMarkerRef.current,
      google,
      label: "BIKE",
      map,
      position: driverPosition,
      title: driverLocation ? "Live driver GPS" : "Driver route preview"
    });
    pickupMarkerRef.current = updateGoogleMarker({
      color: "#00856f",
      currentMarker: pickupMarkerRef.current,
      google,
      label: "P",
      map,
      position: pickupPosition,
      title: ride.pickup.address
    });
    dropoffMarkerRef.current = updateGoogleMarker({
      color: "#e9291c",
      currentMarker: dropoffMarkerRef.current,
      google,
      label: "D",
      map,
      position: dropoffPosition,
      title: ride.dropoff.address
    });

    if (driverLocation?.accuracyMeters) {
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current
          .setCenter(driverPosition);
        accuracyCircleRef.current.setRadius(Math.max(driverLocation.accuracyMeters, 12));
      } else {
        accuracyCircleRef.current = new google.maps.Circle({
          center: driverPosition,
          fillColor: "#63ebd5",
          fillOpacity: 0.16,
          map,
          radius: Math.max(driverLocation.accuracyMeters, 12),
          strokeColor: "#00856f",
          strokeOpacity: 0.8,
          strokeWeight: 2
        });
      }
    } else if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setMap(null);
      accuracyCircleRef.current = null;
    }

    const bounds = new google.maps.LatLngBounds();
    [
      driverPosition,
      pickupPosition,
      dropoffPosition,
      toGoogleLatLng(mapState.activeRoute.start),
      toGoogleLatLng(mapState.activeRoute.end)
    ].forEach((position) => bounds.extend(position));
    map.fitBounds(bounds, 42);
  }, [
    driverLocation,
    mapState.activeRoute.end,
    mapState.activeRoute.start,
    mapState.driverCoordinate,
    mapState.dropoffCoordinate,
    mapState.pickupCoordinate,
    ride.dropoff.address,
    ride.pickup.address
  ]);

  useEffect(() => {
    const google = googleRef.current;
    const map = mapInstanceRef.current;
    const directionsRenderer = directionsRendererRef.current;
    const directionsService = directionsServiceRef.current;

    if (!google || !map || !directionsRenderer || !directionsService) {
      return;
    }

    let disposed = false;
    const fallbackPath = buildFallbackRoute(mapState.activeRoute.start, mapState.activeRoute.end).map(toGoogleLatLng);

    directionsService.route(
      {
        destination: toGoogleLatLng(mapState.activeRoute.end),
        origin: toGoogleLatLng(mapState.activeRoute.start),
        travelMode: google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (disposed) {
          return;
        }

        if (status === google.maps.DirectionsStatus.OK && result) {
          fallbackPolylineRef.current?.setMap(null);
          directionsRenderer.setMap(map);
          directionsRenderer.setDirections(result);
          return;
        }

        directionsRenderer.setMap(null);

        if (fallbackPolylineRef.current) {
          fallbackPolylineRef.current.setMap(map);
          fallbackPolylineRef.current.setPath(fallbackPath);
        } else {
          fallbackPolylineRef.current = new google.maps.Polyline({
            geodesic: true,
            map,
            path: fallbackPath,
            strokeColor: ride.lifecycleStatus === "driver_en_route" ? "#00856f" : "#06243b",
            strokeOpacity: 0.92,
            strokeWeight: 6
          });
        }
      }
    );

    return () => {
      disposed = true;
    };
  }, [mapState.routeKey, ride.lifecycleStatus]);

  return (
    <MapShell
      driverLocation={driverLocation}
      isLocationTracking={isLocationTracking}
      loadState={loadState}
      onStartTracking={onStartTracking}
      onStopTracking={onStopTracking}
      providerName="Google Maps + Directions"
      ride={ride}
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

function LeafletActiveRideMap({
  ride,
  driverLocation,
  isLocationTracking,
  onStartTracking,
  onStopTracking,
  mapState
}: ActiveRideLiveMapProps & { mapState: ResolvedMapState }) {
  const [routePoints, setRoutePoints] = useState<LeafletLatLng[]>(() =>
    buildFallbackRoute(mapState.activeRoute.start, mapState.activeRoute.end)
  );
  const [loadState, setLoadState] = useState<"idle" | "ready" | "failed">("idle");
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<LeafletNamespace | null>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const driverMarkerRef = useRef<LeafletMarker | null>(null);
  const pickupMarkerRef = useRef<LeafletMarker | null>(null);
  const dropoffMarkerRef = useRef<LeafletMarker | null>(null);
  const routePolylineRef = useRef<LeafletPolyline | null>(null);
  const accuracyCircleRef = useRef<LeafletCircle | null>(null);

  useEffect(() => {
    let disposed = false;

    if (!mapRef.current) {
      return;
    }

    void loadLeaflet()
      .then((leaflet) => {
        if (disposed || !mapRef.current) {
          return;
        }

        setLoadState("ready");
        configureLeafletIcons(leaflet);
        leafletRef.current = leaflet;

        const map = leaflet.map(mapRef.current, {
          attributionControl: true,
          zoomControl: true,
          scrollWheelZoom: true
        }).setView(mapState.driverCoordinate, DEFAULT_ZOOM);

        leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);

        mapInstanceRef.current = map;
        window.setTimeout(() => map.invalidateSize(), 100);
      })
      .catch(() => setLoadState("failed"));

    return () => {
      disposed = true;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const fallbackRoute = buildFallbackRoute(mapState.activeRoute.start, mapState.activeRoute.end);
    const controller = new AbortController();

    setRoutePoints(fallbackRoute);

    void loadOsrmRoute(mapState.activeRoute.start, mapState.activeRoute.end, controller.signal)
      .then((points) => {
        if (points.length >= 2) {
          setRoutePoints(points);
        }
      })
      .catch(() => {
        setRoutePoints(fallbackRoute);
      });

    return () => controller.abort();
  }, [mapState.routeKey]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const map = mapInstanceRef.current;

    if (!leaflet || !map) {
      return;
    }

    driverMarkerRef.current = updateLeafletMarker({
      currentMarker: driverMarkerRef.current,
      leaflet,
      map,
      coordinate: mapState.driverCoordinate,
      icon: leaflet.divIcon({
        className: "activeRideBikeIcon",
        html: "<span>BIKE</span>",
        iconSize: [58, 34],
        iconAnchor: [29, 17]
      }),
      popup: driverLocation ? "Live driver GPS" : "Driver route preview"
    });

    pickupMarkerRef.current = updateLeafletMarker({
      currentMarker: pickupMarkerRef.current,
      leaflet,
      map,
      coordinate: mapState.pickupCoordinate,
      icon: leaflet.divIcon({
        className: "activeRideStopIcon activeRidePickupIcon",
        html: "<span>P</span>",
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      }),
      popup: ride.pickup.address
    });

    dropoffMarkerRef.current = updateLeafletMarker({
      currentMarker: dropoffMarkerRef.current,
      leaflet,
      map,
      coordinate: mapState.dropoffCoordinate,
      icon: leaflet.divIcon({
        className: "activeRideStopIcon activeRideDropoffIcon",
        html: "<span>D</span>",
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      }),
      popup: ride.dropoff.address
    });

    if (routePolylineRef.current) {
      routePolylineRef.current.setLatLngs(routePoints);
    } else {
      const routePolyline = leaflet.polyline(routePoints, {
        color: ride.lifecycleStatus === "driver_en_route" ? "#00856f" : "#06243b",
        opacity: 0.92,
        weight: 6,
        lineCap: "round",
        lineJoin: "round"
      });
      routePolyline.addTo(map);
      routePolylineRef.current = routePolyline;
    }

    if (driverLocation?.accuracyMeters) {
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current
          .setLatLng(mapState.driverCoordinate)
          .setRadius(Math.max(driverLocation.accuracyMeters, 12));
      } else {
        const accuracyCircle = leaflet.circle(mapState.driverCoordinate, {
          radius: Math.max(driverLocation.accuracyMeters, 12),
          color: "#00856f",
          fillColor: "#63ebd5",
          fillOpacity: 0.14,
          weight: 2
        });
        accuracyCircle.addTo(map);
        accuracyCircleRef.current = accuracyCircle;
      }
    } else if (accuracyCircleRef.current) {
      accuracyCircleRef.current.remove?.();
      accuracyCircleRef.current = null;
    }

    const bounds = leaflet.latLngBounds([
      mapState.driverCoordinate,
      mapState.pickupCoordinate,
      mapState.dropoffCoordinate,
      ...routePoints
    ]);
    map.fitBounds(bounds, {
      padding: [42, 42],
      maxZoom: 15
    });
  }, [driverLocation, mapState.driverCoordinate, mapState.dropoffCoordinate, mapState.pickupCoordinate, ride.dropoff.address, ride.lifecycleStatus, ride.pickup.address, routePoints]);

  return (
    <MapShell
      driverLocation={driverLocation}
      isLocationTracking={isLocationTracking}
      loadState={loadState}
      onStartTracking={onStartTracking}
      onStopTracking={onStopTracking}
      providerName="Leaflet + OpenStreetMap"
      ride={ride}
    >
      <div className={styles.liveMapCanvas} ref={mapRef}>
        {loadState === "failed" ? (
          <div className={styles.liveMapFallback}>
            Map provider could not load. Live GPS can still sync with the backend.
          </div>
        ) : null}
      </div>
    </MapShell>
  );
}

function MapShell({
  children,
  driverLocation,
  isLocationTracking,
  loadState,
  onStartTracking,
  onStopTracking,
  providerName,
  ride
}: ActiveRideLiveMapProps & {
  children: React.ReactNode;
  loadState: "idle" | "ready" | "failed";
  providerName: string;
}) {
  return (
    <div className={styles.liveRouteMap}>
      {children}

      <div className={styles.liveMapToolbar}>
        <div>
          <span className={styles.eyebrow}>Live map</span>
          <strong>{providerName}</strong>
        </div>
        <Badge tone={loadState === "failed" ? "danger" : driverLocation ? "success" : "warning"}>
          {loadState === "failed" ? "Map failed" : driverLocation ? "GPS active" : "Preview movement"}
        </Badge>
        <Button
          type="button"
          size="sm"
          variant={isLocationTracking ? "secondary" : "mint"}
          onClick={isLocationTracking ? onStopTracking : onStartTracking}
        >
          {isLocationTracking ? "Stop GPS" : "Start GPS"}
        </Button>
      </div>

      <div className={styles.detourWarning}>
        <strong>{ride.route.detourPercentage > 3 ? "Detour warning" : "Route clean"}</strong>
        <p>
          {ride.route.detourPercentage > 3
            ? `Detected ${ride.route.detourPercentage}% detour. Keep rider informed before route change.`
            : `${ride.route.detourPercentage}% detour and ${ride.route.routeAccuracyScore}% route accuracy.`}
        </p>
      </div>

      <div className={styles.mapOverlay}>
        <strong>{routeTitle(ride.lifecycleStatus)}</strong>
        <p>
          {ride.lifecycleStatus === "driver_en_route"
            ? `Navigate ${ride.route.pickupDistanceKm} km to pickup in about ${ride.route.pickupEtaMinutes} minutes.`
            : `Follow the ${ride.route.tripDistanceKm} km trip route with ${ride.route.trafficLevel} traffic.`}
        </p>
        <ProgressBar value={ride.route.routeFairnessScore} label="Route fairness" showValue tone="trust" />
      </div>
    </div>
  );
}

const useResolvedMapState = (
  ride: DriverActiveRideSnapshot,
  driverLocation: DriverLiveLocation | null
): ResolvedMapState => {
  const previewLocation = usePreviewBikeLocation(ride, driverLocation);
  const driverCoordinate = toLatLng(driverLocation ?? previewLocation ?? ride.pickup);
  const pickupCoordinate = toLatLng(ride.pickup);
  const dropoffCoordinate = toLatLng(ride.dropoff);
  const activeRoute = resolveActiveRoute(ride.lifecycleStatus, driverCoordinate, pickupCoordinate, dropoffCoordinate);

  return {
    activeRoute,
    driverCoordinate,
    dropoffCoordinate,
    pickupCoordinate,
    routeKey: toRouteKey(activeRoute.start, activeRoute.end)
  };
};

const usePreviewBikeLocation = (ride: DriverActiveRideSnapshot, driverLocation: DriverLiveLocation | null) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (driverLocation || ride.lifecycleStatus === "completed" || ride.lifecycleStatus === "cancelled") {
      return;
    }

    const intervalId = window.setInterval(() => setNow(Date.now()), 1800);

    return () => window.clearInterval(intervalId);
  }, [driverLocation, ride.lifecycleStatus]);

  return useMemo(() => {
    if (driverLocation) {
      return null;
    }

    if (ride.lifecycleStatus === "completed") {
      return ride.dropoff;
    }

    if (ride.lifecycleStatus === "driver_arrived") {
      return ride.pickup;
    }

    if (ride.lifecycleStatus === "in_progress") {
      return interpolateLocation(ride.pickup, ride.dropoff, resolveLoopProgress(now, 90_000));
    }

    return interpolateLocation(getPreviewStart(ride.pickup, ride.dropoff), ride.pickup, resolveLoopProgress(now, 55_000));
  }, [driverLocation, now, ride.dropoff, ride.lifecycleStatus, ride.pickup]);
};

const updateGoogleMarker = ({
  color,
  currentMarker,
  google,
  label,
  map,
  position,
  title
}: {
  color: string;
  currentMarker: GoogleMarker | null;
  google: GoogleMapsNamespace;
  label: string;
  map: GoogleMap;
  position: GoogleLatLngLiteral;
  title: string;
}) => {
  if (currentMarker) {
    currentMarker.setPosition(position);
    return currentMarker;
  }

  return new google.maps.Marker({
    icon: {
      fillColor: color,
      fillOpacity: 1,
      path: google.maps.SymbolPath.CIRCLE,
      scale: label === "BIKE" ? 18 : 15,
      strokeColor: "#ffffff",
      strokeWeight: 3
    },
    label: {
      color: "#ffffff",
      fontSize: label === "BIKE" ? "10px" : "12px",
      fontWeight: "800",
      text: label
    },
    map,
    position,
    title
  });
};

const updateLeafletMarker = ({
  currentMarker,
  leaflet,
  map,
  coordinate,
  icon,
  popup
}: {
  currentMarker: LeafletMarker | null;
  leaflet: LeafletNamespace;
  map: LeafletMap;
  coordinate: LeafletLatLng;
  icon: unknown;
  popup: string;
}) => {
  if (currentMarker) {
    currentMarker.setLatLng(coordinate);
    return currentMarker;
  }

  const marker = leaflet.marker(coordinate, { icon });
  marker.addTo(map).bindPopup?.(popup);
  return marker;
};

const resolveActiveRoute = (
  status: DriverRideLifecycleStatus,
  driverCoordinate: LeafletLatLng,
  pickupCoordinate: LeafletLatLng,
  dropoffCoordinate: LeafletLatLng
) => {
  if (status === "driver_en_route" || status === "driver_arrived") {
    return {
      start: driverCoordinate,
      end: pickupCoordinate
    };
  }

  if (status === "completed") {
    return {
      start: pickupCoordinate,
      end: dropoffCoordinate
    };
  }

  return {
    start: driverCoordinate,
    end: dropoffCoordinate
  };
};

const loadOsrmRoute = async (start: LeafletLatLng, end: LeafletLatLng, signal: AbortSignal): Promise<LeafletLatLng[]> => {
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`,
    { signal }
  );

  if (!response.ok) {
    return [];
  }

  const data = await response.json() as {
    routes?: Array<{
      geometry?: {
        coordinates?: Array<[number, number]>;
      };
    }>;
  };
  const coordinates = data.routes?.[0]?.geometry?.coordinates ?? [];

  return coordinates
    .map(([longitude, latitude]) => [latitude, longitude] as LeafletLatLng)
    .filter(([latitude, longitude]) => Number.isFinite(latitude) && Number.isFinite(longitude));
};

const buildFallbackRoute = (start: LeafletLatLng, end: LeafletLatLng): LeafletLatLng[] => {
  const midA: LeafletLatLng = [
    start[0] + (end[0] - start[0]) * 0.34,
    start[1] + (end[1] - start[1]) * 0.22
  ];
  const midB: LeafletLatLng = [
    start[0] + (end[0] - start[0]) * 0.7,
    start[1] + (end[1] - start[1]) * 0.86
  ];

  return [start, midA, midB, end];
};

const getPreviewStart = (pickup: DriverRideLocation, dropoff: DriverRideLocation): DriverRideLocation => ({
  address: "Preview driver start",
  latitude: pickup.latitude + (pickup.latitude - dropoff.latitude) * 0.28 + 0.006,
  longitude: pickup.longitude + (pickup.longitude - dropoff.longitude) * 0.2 - 0.008
});

const interpolateLocation = (
  start: DriverRideLocation,
  end: DriverRideLocation,
  progress: number
): DriverRideLocation => ({
  address: "Preview driver location",
  latitude: start.latitude + (end.latitude - start.latitude) * progress,
  longitude: start.longitude + (end.longitude - start.longitude) * progress
});

const resolveLoopProgress = (now: number, durationMs: number) => {
  const rawProgress = (now % durationMs) / durationMs;

  return Math.min(Math.max(rawProgress, 0), 0.96);
};

const toLatLng = (location: DriverRideLocation | DriverLiveLocation): LeafletLatLng => [
  location.latitude,
  location.longitude
];

const toGoogleLatLng = (coordinate: LeafletLatLng): GoogleLatLngLiteral => ({
  lat: coordinate[0],
  lng: coordinate[1]
});

const toRouteKey = (start: LeafletLatLng, end: LeafletLatLng) => [
  start[0].toFixed(ROUTE_REFRESH_PRECISION),
  start[1].toFixed(ROUTE_REFRESH_PRECISION),
  end[0].toFixed(ROUTE_REFRESH_PRECISION),
  end[1].toFixed(ROUTE_REFRESH_PRECISION)
].join(":");

const routeTitle = (status: DriverRideLifecycleStatus) => {
  if (status === "driver_en_route") {
    return "Navigate to pickup";
  }

  if (status === "driver_arrived") {
    return "Ready to start";
  }

  if (status === "in_progress") {
    return "Navigate to dropoff";
  }

  if (status === "completed") {
    return "Ride completed";
  }

  return "Lifecycle ready";
};
