import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLng } from "../../lib/google-maps";

export interface PlaceSuggestion {
  label: string;
  subtitle: string;
  prediction: google.maps.places.PlacePrediction;
}

const SEARCH_DELAY_MS = 200;

/** UK areas, towns and postcodes from Google for the typed text; resolve() gets a picked one's point. */
export const usePlaceSuggestions = (text: string) => {
  const places = useMapsLibrary("places");
  const input = text.trim();

  const [found, setFound] = useState({
    input: "",
    suggestions: [] as PlaceSuggestion[],
  });

  const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(
    null,
  );

  useEffect(() => {
    if (!places || input.length < 2) return;

    let isCancelled = false;

    const timer = window.setTimeout(async () => {
      sessionRef.current ??= new places.AutocompleteSessionToken();

      const results =
        await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: sessionRef.current,
          includedRegionCodes: ["gb"],
          includedPrimaryTypes: ["(regions)"],
        })
          .then(({ suggestions }) => suggestions)
          .catch(() => []);

      if (isCancelled) return;

      setFound({
        input,
        suggestions: results.flatMap(({ placePrediction }) =>
          placePrediction
            ? [
                {
                  label:
                    placePrediction.mainText?.text ?? placePrediction.text.text,
                  subtitle: placePrediction.secondaryText?.text ?? "",
                  prediction: placePrediction,
                },
              ]
            : [],
        ),
      });
    }, SEARCH_DELAY_MS);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [places, input]);

  // fetching the picked place's location ends Google's billing session
  const resolve = useCallback(
    async ({ prediction }: PlaceSuggestion): Promise<LatLng | null> => {
      const place = prediction.toPlace();

      sessionRef.current = null;

      return place
        .fetchFields({ fields: ["location"] })
        .then(() => place.location?.toJSON() ?? null)
        .catch(() => null);
    },
    [],
  );

  return {
    suggestions: found.input === input ? found.suggestions : [],
    isSearching: input.length >= 2 && found.input !== input,
    resolve,
  };
};
