export interface GoogleLatLngLiteral {
  lat: number;
  lng: number;
}

export interface GoogleMap {
  fitBounds(bounds: GoogleLatLngBounds, padding?: number): void;
  setCenter(position: GoogleLatLngLiteral): void;
  setZoom(zoom: number): void;
}

export interface GoogleLatLngBounds {
  extend(position: GoogleLatLngLiteral): GoogleLatLngBounds;
}

export interface GoogleMarker {
  setMap(map: GoogleMap | null): void;
  setPosition(position: GoogleLatLngLiteral): void;
}

export interface GoogleCircle {
  setCenter(position: GoogleLatLngLiteral): void;
  setMap(map: GoogleMap | null): void;
  setRadius(radius: number): void;
}

export interface GooglePolyline {
  setMap(map: GoogleMap | null): void;
  setPath(path: GoogleLatLngLiteral[]): void;
}

export interface GoogleDirectionsRenderer {
  setDirections(result: unknown): void;
  setMap(map: GoogleMap | null): void;
}

export interface GoogleDirectionsService {
  route(
    request: {
      origin: GoogleLatLngLiteral;
      destination: GoogleLatLngLiteral;
      travelMode: string;
    },
    callback: (result: unknown, status: string) => void
  ): void;
}

export interface GoogleMapsNamespace {
  maps: {
    Circle: new (options: Record<string, unknown>) => GoogleCircle;
    DirectionsRenderer: new (options: Record<string, unknown>) => GoogleDirectionsRenderer;
    DirectionsService: new () => GoogleDirectionsService;
    DirectionsStatus: {
      OK: string;
    };
    LatLngBounds: new () => GoogleLatLngBounds;
    Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap;
    Marker: new (options: Record<string, unknown>) => GoogleMarker;
    Polyline: new (options: Record<string, unknown>) => GooglePolyline;
    SymbolPath: {
      CIRCLE: unknown;
    };
    TravelMode: {
      DRIVING: string;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleMapsNamespace;
  }
}

let googleMapsLoadPromise: Promise<GoogleMapsNamespace> | null = null;

export const loadGoogleMaps = (apiKey: string) => {
  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (googleMapsLoadPromise) {
    return googleMapsLoadPromise;
  }

  googleMapsLoadPromise = new Promise<GoogleMapsNamespace>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-good-rapido-google-maps="true"]');

    if (existingScript) {
      existingScript.addEventListener("load", () => (window.google?.maps ? resolve(window.google) : reject(new Error("Google Maps missing"))), {
        once: true
      });
      existingScript.addEventListener("error", () => reject(new Error("Google Maps failed to load")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.dataset.goodRapidoGoogleMaps = "true";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.onload = () => (window.google?.maps ? resolve(window.google) : reject(new Error("Google Maps missing")));
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
};
