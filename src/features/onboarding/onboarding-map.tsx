import {
  AdvancedMarker,
  ColorScheme,
  Map,
  useMap,
} from "@vis.gl/react-google-maps";
import { useEffect } from "react";
import { MAP_ID } from "../../lib/google-maps";
import styles from "../../styles/features/onboarding/wizard-steps.module.css";

interface OnboardingMapProps {
  /** Where the pin is: the dragged pin, else the geocoded address, else central Manchester. */
  center: [number, number];
  /** Re-centre when the geocoded address changes. */
  geocodedLatLng: [number, number] | null;
  isDark: boolean;
  onPin: (latLng: [number, number]) => void;
}

const toLatLng = ([lat, lng]: [number, number]) => ({ lat, lng });

/** Pans to a newly geocoded address. */
const Recenter = ({ target }: { target: [number, number] | null }) => {
  const map = useMap();

  useEffect(() => {
    if (map && target) map.panTo(toLatLng(target));
  }, [map, target]);

  return null;
};

/** "Is the pin in the right place?": a Google map with a draggable pin; tap the map to move it. */
export const OnboardingMap = ({
  center,
  geocodedLatLng,
  isDark,
  onPin,
}: OnboardingMapProps) => {
  const pinAt = (latLng: google.maps.LatLng | null | undefined) => {
    if (latLng) onPin([latLng.lat(), latLng.lng()]);
  };

  return (
    <div
      role="application"
      aria-label="Map. Drag the pin to your location."
      className={styles.map}
    >
      <Map
        mapId={MAP_ID}
        defaultCenter={toLatLng(center)}
        defaultZoom={16}
        colorScheme={isDark ? ColorScheme.DARK : ColorScheme.LIGHT}
        disableDefaultUI
        zoomControl
        gestureHandling="cooperative"
        onClick={({ detail }) =>
          detail.latLng && onPin([detail.latLng.lat, detail.latLng.lng])
        }
      >
        <AdvancedMarker
          position={toLatLng(center)}
          draggable
          title="Your location"
          onDragEnd={({ latLng }) => pinAt(latLng)}
        >
          <svg
            width="30"
            height="40"
            viewBox="0 0 30 40"
            className={styles.mapPin}
          >
            <path
              d="M15 39C15 39 28 24.5 28 14.5A13 13 0 0 0 2 14.5C2 24.5 15 39 15 39Z"
              fill="#8f1112"
              stroke="#fffefb"
              strokeWidth="2.5"
            />
            <circle cx="15" cy="14.5" r="4.5" fill="#fffefb" />
          </svg>
        </AdvancedMarker>
        <Recenter target={geocodedLatLng} />
      </Map>
    </div>
  );
};
