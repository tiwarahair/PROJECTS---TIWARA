import { useEffect } from "react";
import { MapsProvider } from "../../lib/google-maps";
import { usePlaceSuggestions } from "./use-place-suggestions";
import type { PlaceSuggestions } from "./use-place-suggestions";

interface PlacesBridgeProps {
  text: string;
  onChange: (places: PlaceSuggestions) => void;
}

const PlacesReader = ({ text, onChange }: PlacesBridgeProps) => {
  const places = usePlaceSuggestions(text);

  useEffect(() => onChange(places), [places, onChange]);

  return null;
};

/** Google's place suggestions for the Where field; mounted once Where opens, so Maps doesn't load on every visit. */
export const PlacesBridge = (props: PlacesBridgeProps) => (
  <MapsProvider>
    <PlacesReader {...props} />
  </MapsProvider>
);
