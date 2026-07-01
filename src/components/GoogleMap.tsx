import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: any;
    __futquickMapsLoading?: Promise<void>;
    __futquickMapsCb?: () => void;
  }
}

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
const CHANNEL = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (window.__futquickMapsLoading) return window.__futquickMapsLoading;

  window.__futquickMapsLoading = new Promise((resolve, reject) => {
    window.__futquickMapsCb = () => resolve();
    const s = document.createElement("script");
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&loading=async&callback=__futquickMapsCb&channel=${CHANNEL ?? ""}&libraries=places`;
    s.onerror = () => reject(new Error("Falha ao carregar Google Maps"));
    document.head.appendChild(s);
  });
  return window.__futquickMapsLoading;
}

interface Marker {
  lat: number;
  lng: number;
  title?: string;
  onClick?: () => void;
}

export function GoogleMap({
  center,
  zoom = 13,
  markers = [],
  onClick,
  className = "",
  interactive = true,
}: {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: Marker[];
  onClick?: (coords: { lat: number; lng: number }) => void;
  className?: string;
  interactive?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(() => {
      if (cancelled || !ref.current) return;
      mapRef.current = new window.google.maps.Map(ref.current, {
        center,
        zoom,
        disableDefaultUI: true,
        gestureHandling: interactive ? "greedy" : "none",
        clickableIcons: false,
        styles: darkStyle,
      });
      if (onClick) {
        mapRef.current.addListener("click", (e: any) => {
          onClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });
      }
    }).catch((e) => console.error(e));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center
  useEffect(() => {
    if (mapRef.current) mapRef.current.setCenter(center);
  }, [center.lat, center.lng]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !window.google) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = markers.map((m) => {
      const marker = new window.google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map: mapRef.current,
        title: m.title,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#22d3ee",
          fillOpacity: 1,
          strokeColor: "#0a1224",
          strokeWeight: 3,
        },
      });
      if (m.onClick) marker.addListener("click", m.onClick);
      return marker;
    });
  }, [markers]);

  return <div ref={ref} className={className} />;
}

const darkStyle = [
  { elementType: "geometry", stylers: [{ color: "#0f1a2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7a8fa9" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#c9d5e6" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1c2b47" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#5d738e" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#25385c" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#08111f" }] },
];
