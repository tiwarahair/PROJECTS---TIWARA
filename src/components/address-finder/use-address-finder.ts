// State and behaviour of the one address field.
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, RefObject } from "react";
import { ADDRESS_TYPES, toPlaceAddress } from "../../lib/google-maps";
import type { PlaceAddress } from "../../lib/google-maps";
import {
  formatPostcode,
  getAddressLines,
  getDistrict,
  isPostcodeValid,
  toSegments,
} from "../../utils/address";
import type { HighlightSegment } from "../../utils/address";

type AddressSource = "pick" | "manual";
type FieldKey = "line1" | "line2" | "town" | "postcode";
type Mode = "find" | "summary" | "manual";

interface AddressDraft {
  line1: string;
  line2: string;
  town: string;
  postcode: string;
}

export interface AddressFinderValue extends Partial<AddressDraft> {
  // pages pass their own sources too (Booking: "saved"); only "manual" changes the finder's mode
  source?: string;
}

/** What onChange receives: the trimmed address, its district, and (when picked from Google) its location and area. */
export interface EmittedAddress extends AddressDraft {
  source: AddressSource;
  district: string;
  lat: number | null;
  lng: number | null;
  area: string | null;
}

/** One Google Places suggestion, with the matched text highlighted. */
export interface AddressSuggestion {
  id: string;
  prediction: google.maps.places.PlacePrediction;
  line: HighlightSegment[];
  secondaryLine: HighlightSegment[];
}

const MAX_RESULTS = 5;
const SEARCH_DELAY_MS = 200;

const getRanges = (text?: google.maps.places.FormattableText | null) =>
  (text?.matches ?? []).map(({ startOffset, endOffset }): [number, number] => [
    startOffset,
    endOffset,
  ]);

const toSuggestion = (
  prediction: google.maps.places.PlacePrediction,
): AddressSuggestion => ({
  id: prediction.placeId,
  prediction,
  line: toSegments(
    prediction.mainText?.text ?? prediction.text.text,
    getRanges(prediction.mainText ?? prediction.text),
  ),
  secondaryLine: toSegments(
    prediction.secondaryText?.text ?? "",
    getRanges(prediction.secondaryText),
  ),
});

export type AddressFixture =
  | ""
  | "typing"
  | "postcode"
  | "typo"
  | "nomatch"
  | "summary"
  | "manual"
  | "errors"
  | "manual-errors";

interface FinderState {
  mode: Mode;
  query: string;
  open: boolean;
  highlightedIndex: number;
  showLine2: boolean;
  touched: Partial<Record<FieldKey | "query", 1>>;
  draft: AddressDraft;
  sum: AddressDraft | null;
  hits: AddressSuggestion[];
  /** The query the hits belong to; the list opens once they arrive. */
  searchedQuery: string;
}

interface UseAddressFinderOptions {
  value?: AddressFinderValue | null;
  onChange?: (address: EmittedAddress | null) => void;
  fixture?: AddressFixture;
  showErrors?: boolean;
  autoFocus?: boolean;
}

const getBlank = (): AddressDraft => ({
  line1: "",
  line2: "",
  town: "",
  postcode: "",
});

const DEMO_ADDRESS: AddressDraft = {
  line1: "14 Blossom Street",
  line2: "",
  town: "Manchester",
  postcode: "M4 6AJ",
};

const getInitialState = (
  value: AddressFinderValue | null | undefined,
  fixture: AddressFixture,
): FinderState => {
  const state: FinderState = {
    mode: "find",
    query: "",
    open: false,
    highlightedIndex: -1,
    showLine2: false,
    touched: {},
    draft: getBlank(),
    sum: null,
    hits: [],
    searchedQuery: "",
  };

  if (value && (value.line1 || value.postcode)) {
    const draft = {
      line1: value.line1 || "",
      line2: value.line2 || "",
      town: value.town || "",
      postcode: value.postcode || "",
    };

    Object.assign(state, {
      draft,
      sum: draft,
      mode: value.source === "manual" ? "manual" : "summary",
      showLine2: !!draft.line2,
    });
  }

  if (fixture === "typing")
    Object.assign(state, { query: "14 Blos", open: true });

  if (fixture === "postcode")
    Object.assign(state, { query: "M14 5", open: true });

  if (fixture === "typo") Object.assign(state, { query: "Blosom", open: true });

  if (fixture === "nomatch")
    Object.assign(state, { query: "99 Nowhere Lane", open: true });

  if (fixture === "summary")
    Object.assign(state, {
      mode: "summary",
      sum: DEMO_ADDRESS,
      draft: DEMO_ADDRESS,
    });

  if (fixture === "manual")
    Object.assign(state, {
      mode: "manual",
      draft: { ...DEMO_ADDRESS, line2: "Flat 3" },
      showLine2: true,
    });

  if (fixture === "manual-errors")
    Object.assign(state, {
      mode: "manual",
      draft: { line1: "", line2: "", town: "", postcode: "M4 6" },
      touched: { line1: 1, town: 1, postcode: 1 },
    });

  if (fixture === "errors") Object.assign(state, { touched: { query: 1 } });

  return state;
};

export const useAddressFinder = ({
  value,
  onChange,
  fixture = "",
  showErrors = false,
  autoFocus = false,
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

    if (!address) {
      callback(null);

      return;
    }

    callback({
      line1: address.line1.trim(),
      line2: (address.line2 || "").trim(),
      town: address.town.trim(),
      postcode: isPostcodeValid(address.postcode)
        ? formatPostcode(address.postcode)
        : address.postcode.trim().toUpperCase(),
      source: source ?? "manual",
      district: getDistrict(address.postcode),
      lat: place?.location?.lat ?? null,
      lng: place?.location?.lng ?? null,
      area: place?.area ?? null,
    });
  };

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

  // fixtures that seed an address report it once, on mount
  useEffect(() => {
    if (fixture === "summary" || fixture === "manual")
      emit(state.draft, fixture === "manual" ? "manual" : "pick");

    let focusTimer = 0;

    if (autoFocus && state.mode === "find")
      focusTimer = window.setTimeout(() => queryRef.current?.focus(), 60);

    return () => {
      window.clearTimeout(focusTimer);
      window.clearTimeout(blurTimerRef.current);
    };
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // follow external value changes
  useEffect(() => {
    const previous = previousValueRef.current;

    previousValueRef.current = value;

    if (value === previous || emittingRef.current) return;

    if (value?.line1 && state.mode === "find") {
      const draft = {
        line1: value.line1,
        line2: value.line2 || "",
        town: value.town || "",
        postcode: value.postcode || "",
      };

      update({ mode: "summary", sum: draft, draft });
    } else if (
      !(value && (value.line1 || value.postcode)) &&
      previous?.line1 &&
      state.mode === "summary"
    )
      update({ mode: "find", sum: null, draft: getBlank(), query: "" });
  }, [value, state.mode, update]);

  // Google suggestions for the query, a moment after typing stops
  useEffect(() => {
    const input = state.query.trim();

    if (!places || state.mode !== "find" || input.length < 3) return;

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      sessionRef.current ??= new places.AutocompleteSessionToken();

      const { suggestions } =
        await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: sessionRef.current,
          includedRegionCodes: ["gb"],
          includedPrimaryTypes: ADDRESS_TYPES,
        });

      if (cancelled) return;

      update({
        searchedQuery: input,
        hits: suggestions
          .flatMap(({ placePrediction }) =>
            placePrediction ? [toSuggestion(placePrediction)] : [],
          )
          .slice(0, MAX_RESULTS),
      });
    }, SEARCH_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [places, state.query, state.mode, update]);

  /** Fetches the picked place's address parts and location (this ends the billing session). */
  const pick = async (hit: AddressSuggestion) => {
    const place = hit.prediction.toPlace();

    await place.fetchFields({ fields: ["addressComponents", "location"] });
    sessionRef.current = null;

    const found = toPlaceAddress(
      (place.addressComponents ?? []).map(({ longText, types }) => ({
        text: longText ?? "",
        types,
      })),
      place.location?.toJSON() ?? null,
    );

    const { line1, line2, town, postcode } = found;
    const draft = { line1, line2, town, postcode };

    update({
      mode: "summary",
      sum: draft,
      draft,
      query: "",
      open: false,
      highlightedIndex: -1,
      touched: {},
    });

    emit(draft, "pick", found);
    focusLater("edit");
  };

  const toManual = (options: { showLine2?: boolean } = {}) => {
    const { sum, query } = state;
    const draft = sum ? { ...sum } : getBlank();

    if (!sum && query && isPostcodeValid(query))
      draft.postcode = formatPostcode(query);
    else if (!sum && query && !/^[A-Z]{1,2}\d/i.test(query.trim()))
      draft.line1 = query.trim();

    const showLine2 = options.showLine2 || !!draft.line2;

    update({
      mode: "manual",
      draft,
      showLine2,
      open: false,
      highlightedIndex: -1,
      touched: {},
    });

    emit(draft, "manual");
    focusLater(options.showLine2 ? "line2" : "line1");
  };

  const toFind = () => {
    update({
      mode: "find",
      sum: null,
      draft: getBlank(),
      query: "",
      open: false,
      showLine2: false,
      touched: {},
    });

    emit(null);
    focusLater("query");
  };

  const hits = state.mode === "find" ? state.hits : [];

  const isOpen =
    state.open &&
    state.query.trim().length >= 3 &&
    state.searchedQuery === state.query.trim();

  const isErrorShown = (key: FieldKey | "query") =>
    !!(showErrors || state.touched[key]);

  const queryError =
    state.mode === "find" && isErrorShown("query") && !value?.line1
      ? "Enter your address or postcode, or enter it manually"
      : "";

  const { draft } = state;

  const fieldErrors: Record<FieldKey, string> = {
    line1: !draft.line1.trim() ? "Enter the first line of the address" : "",
    line2: "",
    town: !draft.town.trim() ? "Enter a town or city" : "",
    postcode: !isPostcodeValid(draft.postcode)
      ? "Enter a real UK postcode, like M4 6AJ"
      : "",
  };

  const setDraftField = (key: FieldKey, fieldValue: string) => {
    const next = { ...state.draft, [key]: fieldValue };

    update({ draft: next });
    emit(next, "manual");
  };

  const handleFieldChange =
    (key: FieldKey) => (event: ChangeEvent<HTMLInputElement>) =>
      setDraftField(
        key,
        key === "postcode"
          ? event.target.value.toUpperCase().slice(0, 8)
          : event.target.value,
      );

  const handleFieldBlur = (key: FieldKey) => () => {
    setState((current) => ({
      ...current,
      touched: { ...current.touched, [key]: 1 },
    }));

    if (key === "postcode" && isPostcodeValid(draft.postcode))
      setDraftField("postcode", formatPostcode(draft.postcode));
  };

  const handleQueryKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const count = hits.length;

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!isOpen) {
        update({ open: true });

        return;
      }

      if (count)
        update({ highlightedIndex: (state.highlightedIndex + 1) % count });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();

      if (count)
        update({
          highlightedIndex:
            state.highlightedIndex <= 0
              ? count - 1
              : state.highlightedIndex - 1,
        });
    } else if (event.key === "Enter") {
      event.preventDefault();
      const chosen = hits[state.highlightedIndex];

      if (isOpen && state.highlightedIndex >= 0 && chosen) void pick(chosen);
      else if (isOpen && count === 1 && hits[0]) void pick(hits[0]);
    } else if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      update({ open: false, highlightedIndex: -1 });
    }
  };

  return {
    state,
    hits,
    isOpen,
    queryError,
    fieldErrors,
    isErrorShown,
    summaryLines: getAddressLines(state.sum || draft),
    queryRef,
    editRef,
    fieldRefs,
    pick,
    toManual,
    toFind,
    handleFieldChange,
    handleFieldBlur,
    handleQueryKeyDown,
    handleQueryChange: (event: ChangeEvent<HTMLInputElement>) =>
      update({ query: event.target.value, open: true, highlightedIndex: -1 }),
    handleQueryFocus: () => {
      window.clearTimeout(blurTimerRef.current);

      if (state.query.trim().length >= 3) update({ open: true });
    },
    handleQueryBlur: () => {
      blurTimerRef.current = window.setTimeout(
        () => update({ open: false, highlightedIndex: -1 }),
        120,
      );
    },
    clearQuery: () => {
      update({ query: "", open: false, highlightedIndex: -1 });
      focusLater("query");
    },
    setActiveIndex: (index: number) => {
      if (state.highlightedIndex !== index) update({ highlightedIndex: index });
    },
  };
};
