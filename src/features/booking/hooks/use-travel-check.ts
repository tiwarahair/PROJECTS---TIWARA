import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useState } from "react";
import type { LatLng } from "../../../lib/google-maps";
import { useIsInTravelAreaQuery } from "../../../stores/api-slice";
import { isAddressValid } from "../../../utils/address";
import type { BookingAddress } from "../logic/types";

export const useTravelCheck = (
  serviceId: string,
  address: BookingAddress,
  isMobile: boolean,
) => {
  const geocoding = useMapsLibrary("geocoding");
  const { line1, town, postcode, lat, lng } = address;
  const query = isAddressValid(address) ? `${line1}, ${town}, ${postcode}` : "";

  const [geocoded, setGeocoded] = useState({
    query: "",
    point: null as LatLng | null,
  });

  const hasPoint = lat != null && lng != null;

  useEffect(() => {
    if (!isMobile || hasPoint || !query || !geocoding) return;

    let isCancelled = false;

    const findPoint = async () => {
      try {
        const { results } = await new geocoding.Geocoder().geocode({
          address: query,
          componentRestrictions: { country: "GB" },
        });

        return results[0]?.geometry.location.toJSON() ?? null;
      } catch {
        return null;
      }
    };

    void findPoint().then((point) => {
      if (!isCancelled) setGeocoded({ query, point });
    });

    return () => {
      isCancelled = true;
    };
  }, [isMobile, hasPoint, query, geocoding]);

  const geocodedPoint = geocoded.query === query ? geocoded.point : null;
  const point = hasPoint ? { lat, lng } : geocodedPoint;

  const { currentData: inArea } = useIsInTravelAreaQuery(
    { serviceId, lat: point?.lat ?? 0, lng: point?.lng ?? 0 },
    { skip: !isMobile || !point || !serviceId },
  );

  return {
    point,
    inArea: inArea === true,
    outBlock: inArea === false,
  };
};
