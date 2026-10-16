import { useCallback } from "react";
import { MODE_KEY, STORAGE_KEY } from "./onboarding-data";
import type { OnboardingBase } from "./use-base";

export const useOnboardingStorage = ({
  resolved,
  stateRef,
  formApi: { getValues },
  setState,
}: OnboardingBase) => {
  /** Saves wizard progress (never passwords); boards never save. */
  const save = useCallback(() => {
    if (resolved.board) return;

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
  }, [resolved.board, getValues, stateRef]);

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
