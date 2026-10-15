import { useEffect, useState } from "react";
import type { LatLng } from "../../lib/google-maps";

type PositionStatus = "asking" | "found" | "denied" | "unavailable";

const POSITION_KEY = "search.position";
const MAX_WAIT_MS = 3000;

const readSavedPosition = (): LatLng | null => {
  try {
    const saved = sessionStorage.getItem(POSITION_KEY);

    return saved ? (JSON.parse(saved) as LatLng) : null;
  } catch {
    return null;
  }
};

const savePosition = (position: LatLng) => {
  try {
    sessionStorage.setItem(POSITION_KEY, JSON.stringify(position));
  } catch {
    // storage blocked: the next visit just asks again
  }
};

const isLocationAllowed = async () => {
  try {
    const { state } = await navigator.permissions.query({
      name: "geolocation",
    });

    return state === "granted";
  } catch {
    return false;
  }
};

/**
 * The device's location, asked for once when Search opens (once allowed, browsers answer without a pop-up).
 * isWaiting: worth holding the search for it — only when access is already allowed, and never for long.
 */
export const useCurrentPosition = () => {
  const [position, setPosition] = useState<LatLng | null>(readSavedPosition);

  const [status, setStatus] = useState<PositionStatus>(() => {
    if (position) return "found";

    return "geolocation" in navigator ? "asking" : "unavailable";
  });

  const [isWaiting, setIsWaiting] = useState(status === "asking");

  useEffect(() => {
    if (readSavedPosition() || !("geolocation" in navigator)) return;

    const timer = window.setTimeout(() => setIsWaiting(false), MAX_WAIT_MS);

    void isLocationAllowed().then((isAllowed) => {
      if (!isAllowed) setIsWaiting(false);
    });

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const found = { lat: coords.latitude, lng: coords.longitude };

        savePosition(found);
        setPosition(found);
        setStatus("found");
        setIsWaiting(false);
      },
      ({ code, PERMISSION_DENIED }) => {
        setStatus(code === PERMISSION_DENIED ? "denied" : "unavailable");
        setIsWaiting(false);
      },
      { maximumAge: 10 * 60 * 1000, timeout: 15 * 1000 },
    );

    return () => window.clearTimeout(timer);
  }, []);

  return { position, status, isWaiting };
};
