import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./wizard-steps.module.css";

interface OnboardingMapProps {
  /** Where the pin starts: the dragged pin, else the geocoded postcode, else central Manchester. */
  center: [number, number];
  /** Re-centre when the geocoded postcode changes (prototype centerMap). */
  geo: [number, number] | null;
  isDark: boolean;
  onPin: (latLng: [number, number]) => void;
}

const getTileUrl = (isDark: boolean) =>
  "https://{s}.basemaps.cartocdn.com/" +
  (isDark ? "dark_all" : "light_all") +
  "/{z}/{x}/{y}{r}.png";

// the crimson pin, verbatim from the prototype's divIcon
const PIN_HTML =
  '<div style="width:30px;height:40px;filter:drop-shadow(0 6px 8px rgba(26,23,20,.35))"><svg width="30" height="40" viewBox="0 0 30 40"><path d="M15 39C15 39 28 24.5 28 14.5A13 13 0 0 0 2 14.5C2 24.5 15 39 15 39Z" fill="#8f1112" stroke="#fffefb" stroke-width="2.5"/><circle cx="15" cy="14.5" r="4.5" fill="#fffefb"/></svg></div>';

/** "Is the pin in the right place?": Leaflet + CARTO tiles, a draggable pin; tap the map to move it. */
export const OnboardingMap = ({
  center,
  geo,
  isDark,
  onPin,
}: OnboardingMapProps) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const onPinRef = useRef(onPin);
  onPinRef.current = onPin;
  const initial = useRef({ center, isDark });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const { center: start, isDark: dark } = initial.current;
    const map = L.map(element, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: false,
    }).setView(start, 16);
    tileRef.current = L.tileLayer(getTileUrl(dark), {
      maxZoom: 19,
      subdomains: "abcd",
      attribution: "© OpenStreetMap, © CARTO",
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    const icon = L.divIcon({
      className: "",
      iconSize: [30, 40],
      iconAnchor: [15, 38],
      html: PIN_HTML,
    });
    const marker = L.marker(start, {
      draggable: true,
      icon,
      keyboard: true,
      title: "Your location",
    }).addTo(map);
    marker.on("dragend", () => {
      const { lat, lng } = marker.getLatLng();
      onPinRef.current([lat, lng]);
    });
    map.on("click", (event: L.LeafletMouseEvent) => {
      marker.setLatLng(event.latlng);
      onPinRef.current([event.latlng.lat, event.latlng.lng]);
    });
    mapRef.current = map;
    markerRef.current = marker;
    // the section animates in; measure again once it has settled
    const timer = window.setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // map already removed
      }
    }, 380);
    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      tileRef.current = null;
    };
  }, []);

  useEffect(() => {
    tileRef.current?.setUrl(getTileUrl(isDark));
  }, [isDark]);

  useEffect(() => {
    if (!geo || !mapRef.current) return;
    mapRef.current.setView(geo, 16, { animate: true });
    markerRef.current?.setLatLng(geo);
  }, [geo]);

  return (
    <div
      ref={elementRef}
      role="application"
      aria-label="Map. Drag the pin to your location."
      className={styles.map}
    ></div>
  );
};
