const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

export type LeafletLatLng = [number, number];

export interface LeafletMap {
  setView(center: LeafletLatLng, zoom: number): LeafletMap;
  fitBounds(bounds: unknown, options?: Record<string, unknown>): LeafletMap;
  remove(): void;
  invalidateSize(): void;
}

export interface LeafletLayer {
  addTo(map: LeafletMap): LeafletLayer;
  bindPopup?(content: string): LeafletLayer;
  remove?(): void;
}

export interface LeafletMarker extends LeafletLayer {
  setLatLng(latlng: LeafletLatLng): LeafletMarker;
}

export interface LeafletCircle extends LeafletLayer {
  setLatLng(latlng: LeafletLatLng): LeafletCircle;
  setRadius(radius: number): LeafletCircle;
}

export interface LeafletPolyline extends LeafletLayer {
  setLatLngs(latlngs: LeafletLatLng[]): LeafletPolyline;
  getBounds(): unknown;
}

interface LeafletIconFactory {
  Default?: {
    prototype: {
      _getIconUrl?: unknown;
    };
    mergeOptions(options: Record<string, string>): void;
  };
}

export interface LeafletNamespace {
  Icon?: LeafletIconFactory;
  map(element: HTMLElement, options?: Record<string, unknown>): LeafletMap;
  tileLayer(url: string, options?: Record<string, unknown>): LeafletLayer;
  marker(latlng: LeafletLatLng, options?: Record<string, unknown>): LeafletMarker;
  circle(latlng: LeafletLatLng, options?: Record<string, unknown>): LeafletCircle;
  polyline(latlngs: LeafletLatLng[], options?: Record<string, unknown>): LeafletPolyline;
  divIcon(options?: Record<string, unknown>): unknown;
  latLngBounds(latlngs: LeafletLatLng[]): unknown;
}

declare global {
  interface Window {
    L?: LeafletNamespace;
  }
}

let leafletLoadPromise: Promise<LeafletNamespace> | null = null;

export const loadLeaflet = () => {
  if (window.L) {
    return Promise.resolve(window.L);
  }

  if (leafletLoadPromise) {
    return leafletLoadPromise;
  }

  ensureLeafletStylesheet();

  leafletLoadPromise = new Promise<LeafletNamespace>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${LEAFLET_JS_URL}"]`);

    if (existingScript) {
      existingScript.addEventListener("load", () => (window.L ? resolve(window.L) : reject(new Error("Leaflet missing"))), {
        once: true
      });
      existingScript.addEventListener("error", () => reject(new Error("Leaflet failed to load")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.onload = () => (window.L ? resolve(window.L) : reject(new Error("Leaflet missing")));
    script.onerror = () => reject(new Error("Leaflet failed to load"));
    document.head.appendChild(script);
  });

  return leafletLoadPromise;
};

export const configureLeafletIcons = (leaflet: LeafletNamespace) => {
  if (!leaflet.Icon?.Default) {
    return;
  }

  delete leaflet.Icon.Default.prototype._getIconUrl;
  leaflet.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
  });
};

const ensureLeafletStylesheet = () => {
  if (document.querySelector(`link[href="${LEAFLET_CSS_URL}"]`)) {
    return;
  }

  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = LEAFLET_CSS_URL;
  document.head.appendChild(stylesheet);
};
