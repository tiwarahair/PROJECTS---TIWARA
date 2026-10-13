// Google Maps Platform: address autocomplete, geocoding and the onboarding pin map.
import { APIProvider } from "@vis.gl/react-google-maps";
import type { ReactNode } from "react";

export const MAP_ID = import.meta.env.VITE_GOOGLE_MAP_ID;

/** Address-like results only (Places Autocomplete allows up to five types). */
export const ADDRESS_TYPES = [
  "street_address",
  "premise",
  "subpremise",
  "postal_code",
];

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PlaceAddress {
  line1: string;
  line2: string;
  town: string;
  postcode: string;
  /** "Rusholme, M14": the public area shown for home-based stylists. */
  area: string | null;
  location: LatLng | null;
}

interface AddressPart {
  text: string;
  types: string[];
}

/** Loads the Maps JavaScript API for the components inside it (only where an address or map is shown). */
export const MapsProvider = ({ children }: { children: ReactNode }) => (
  <APIProvider
    apiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY}
    language="en-GB"
    region="GB"
  >
    {children}
  </APIProvider>
);

export const toPlaceAddress = (
  parts: AddressPart[],
  location: LatLng | null,
): PlaceAddress => {
  const getPart = (type: string) =>
    parts.find(({ types }) => types.includes(type))?.text ?? "";

  const number = getPart("street_number");
  const street = [number, getPart("route")].filter(Boolean).join(" ");

  const building = [getPart("subpremise"), getPart("premise")]
    .filter(Boolean)
    .join(", ");

  // UK order: "12 High Street, Flat 3" but "Stopford Building, Oxford Road"
  const [line1, line2] = number
    ? [street, building]
    : [building || street, building ? street : ""];

  const town = getPart("postal_town") || getPart("locality");
  const postcode = getPart("postal_code");

  const neighbourhood =
    getPart("sublocality_level_1") || getPart("neighborhood") || town;

  return {
    line1,
    line2,
    town,
    postcode,
    area:
      [neighbourhood, postcode.split(" ")[0]].filter(Boolean).join(", ") ||
      null,
    location,
  };
};

/** Geocodes a postcode or typed address (once per save, never per keystroke). */
export const geocodeAddress = async (
  address: string,
): Promise<PlaceAddress | null> => {
  if (!window.google?.maps) return null;

  const { Geocoder } = (await google.maps.importLibrary(
    "geocoding",
  )) as google.maps.GeocodingLibrary;

  const { results } = await new Geocoder().geocode({
    address,
    componentRestrictions: { country: "GB" },
  });

  const [result] = results;

  if (!result) return null;

  return toPlaceAddress(
    result.address_components.map(({ long_name: text, types }) => ({
      text,
      types,
    })),
    result.geometry.location.toJSON(),
  );
};
