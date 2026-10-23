import { useCallback } from "react";
import { MODE_KEY, STORAGE_KEY } from "./data";
import type { OnboardingBase } from "./use-base";

export const useOnboardingStorage = ({
  stateRef,
  formApi: { getValues },
  setState,
}: OnboardingBase) => {
  /** Saves wizard progress (never passwords). */
  const save = useCallback(() => {
    const { addressOpen, pinLatLng, geocodedLatLng, area } = stateRef.current;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          form: { ...getValues(), password: "", passwordConfirm: "" },
          addressOpen,
          pinLatLng,
          geocodedLatLng,
          area,
        }),
      );
    } catch {
      // storage unavailable
    }
  }, [getValues, stateRef]);

  const clearSaved = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage unavailable
    }
  };

  const setMode = useCallback(
    (mode: "light" | "dark") => {
      try {
        localStorage.setItem(MODE_KEY, mode);
      } catch {
        // storage unavailable
      }

      setState({ mode });
    },
    [setState],
  );

  return { save, clearSaved, setMode };
};
