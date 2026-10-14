import { useEffect, useState } from "react";
import type { LatLng } from "../../lib/google-maps";

type PositionStatus = "asking" | "found" | "denied" | "unavailable";

/** The device's location, asked for once when Search opens (once allowed, browsers answer without a pop-up). */
export const useCurrentPosition = () => {
  const [position, setPosition] = useState<LatLng | null>(null);

  const [status, setStatus] = useState<PositionStatus>(() =>
    "geolocation" in navigator ? "asking" : "unavailable",
  );

  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ lat: coords.latitude, lng: coords.longitude });
        setStatus("found");
      },
      ({ code, PERMISSION_DENIED }) =>
        setStatus(code === PERMISSION_DENIED ? "denied" : "unavailable"),
      { maximumAge: 10 * 60 * 1000, timeout: 15 * 1000 },
    );
  }, []);

  return { position, status };
};
