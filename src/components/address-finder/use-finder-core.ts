import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useCallback, useRef, useState } from "react";
import type { RefObject } from "react";
import type { PlaceAddress } from "../../lib/google-maps";
import type {
  AddressDraft,
  AddressSource,
  FieldKey,
  FinderState,
  UseAddressFinderOptions,
} from "./data";
import { getInitialState, toEmittedAddress } from "./state";

export const useFinderCore = ({
  value,
  onChange,
  fixture = "",
}: UseAddressFinderOptions) => {
  const [state, setState] = useState<FinderState>(() =>
    getInitialState(value, fixture),
  );

  const update = useCallback(
    (patch: Partial<FinderState>) =>
      setState((current) => ({ ...current, ...patch })),
    [],
  );

  const queryRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);

  const fieldRefs: Record<FieldKey, RefObject<HTMLInputElement | null>> = {
    line1: useRef<HTMLInputElement>(null),
    line2: useRef<HTMLInputElement>(null),
    town: useRef<HTMLInputElement>(null),
    postcode: useRef<HTMLInputElement>(null),
  };

  // set while our own emit is in flight, so the value echo does not reset the mode
  const emittingRef = useRef(false);
  const blurTimerRef = useRef(0);
  const previousValueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  onChangeRef.current = onChange;

  const places = useMapsLibrary("places");

  const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(
    null,
  );

  const emit = (
    address: AddressDraft | null,
    source?: AddressSource,
    place?: PlaceAddress,
  ) => {
    const callback = onChangeRef.current;

    if (!callback) return;

    emittingRef.current = true;

    window.setTimeout(() => {
      emittingRef.current = false;
    }, 0);

    callback(address ? toEmittedAddress(address, source, place) : null);
  };

  const clearBlurTimer = () => window.clearTimeout(blurTimerRef.current);

  const focusLater = (target: "query" | "edit" | FieldKey) =>
    window.setTimeout(() => {
      const getRef = () => {
        if (target === "query") return queryRef;

        if (target === "edit") return editRef;

        return fieldRefs[target];
      };

      const ref = getRef();

      ref.current?.focus();
    }, 30);

  return {
    state,
    setState,
    update,
    queryRef,
    editRef,
    fieldRefs,
    emittingRef,
    blurTimerRef,
    clearBlurTimer,
    previousValueRef,
    places,
    sessionRef,
    emit,
    focusLater,
  };
};

export type FinderCore = ReturnType<typeof useFinderCore>;
