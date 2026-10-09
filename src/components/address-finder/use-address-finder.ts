// State and behaviour of the one address field, ported from prototype AddressFinder.dc.html (class Component).
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, RefObject } from "react";
import {
  formatPostcode,
  getAddressLines,
  getPostcodeGeo,
  isPostcodeValid,
  searchAddresses,
} from "../../utils/address";
import type { AddressSuggestion } from "../../utils/address";

export type AddressSource = "pick" | "manual";
type FieldKey = "line1" | "line2" | "town" | "postcode";
type Mode = "find" | "summary" | "manual";

export interface AddressDraft {
  line1: string;
  line2: string;
  town: string;
  postcode: string;
}

export interface AddressFinderValue extends Partial<AddressDraft> {
  source?: AddressSource;
}

/** What onChange receives: the trimmed address plus district / lat / lng from the demo postcodes. */
export interface EmittedAddress extends AddressDraft {
  source: AddressSource;
  district: string;
  lat: number | null;
  lng: number | null;
}

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
  q: string;
  open: boolean;
  idx: number;
  l2: boolean;
  touched: Partial<Record<FieldKey | "q", 1>>;
  draft: AddressDraft;
  sum: AddressDraft | null;
}

export interface UseAddressFinderOptions {
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
    q: "",
    open: false,
    idx: -1,
    l2: false,
    touched: {},
    draft: getBlank(),
    sum: null,
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
      l2: !!draft.line2,
    });
  }
  if (fixture === "typing") Object.assign(state, { q: "14 Blos", open: true });
  if (fixture === "postcode") Object.assign(state, { q: "M14 5", open: true });
  if (fixture === "typo") Object.assign(state, { q: "Blosom", open: true });
  if (fixture === "nomatch")
    Object.assign(state, { q: "99 Nowhere Lane", open: true });
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
      l2: true,
    });
  if (fixture === "manual-errors")
    Object.assign(state, {
      mode: "manual",
      draft: { line1: "", line2: "", town: "", postcode: "M4 6" },
      touched: { line1: 1, town: 1, postcode: 1 },
    });
  if (fixture === "errors") Object.assign(state, { touched: { q: 1 } });
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

  const emit = (address: AddressDraft | null, source?: AddressSource) => {
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
    const { district, lat, lng } = getPostcodeGeo(address.postcode);
    callback({
      line1: address.line1.trim(),
      line2: (address.line2 || "").trim(),
      town: address.town.trim(),
      postcode: isPostcodeValid(address.postcode)
        ? formatPostcode(address.postcode)
        : address.postcode.trim().toUpperCase(),
      source: source ?? "manual",
      district: district || "",
      lat,
      lng,
    });
  };

  const focusLater = (target: "q" | "edit" | FieldKey) =>
    window.setTimeout(() => {
      const ref =
        target === "q"
          ? queryRef
          : target === "edit"
            ? editRef
            : fieldRefs[target];
      ref.current?.focus();
    }, 30);

  // fixtures that seed an address report it once, like the prototype's componentDidMount
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

  // follow external value changes (componentDidUpdate)
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
      update({ mode: "find", sum: null, draft: getBlank(), q: "" });
  }, [value, state.mode, update]);

  const pick = (hit: AddressSuggestion) => {
    const { line1, line2, town, postcode } = hit.a;
    const draft = { line1, line2: line2 || "", town, postcode };
    update({
      mode: "summary",
      sum: draft,
      draft,
      q: "",
      open: false,
      idx: -1,
      touched: {},
    });
    emit(draft, "pick");
    focusLater("edit");
  };

  const toManual = (options: { l2?: boolean } = {}) => {
    const { sum, q } = state;
    const draft = sum ? { ...sum } : getBlank();
    if (!sum && q && isPostcodeValid(q)) draft.postcode = formatPostcode(q);
    else if (!sum && q && !/^[A-Z]{1,2}\d/i.test(q.trim()))
      draft.line1 = q.trim();
    const l2 = options.l2 || !!draft.line2;
    update({ mode: "manual", draft, l2, open: false, idx: -1, touched: {} });
    emit(draft, "manual");
    focusLater(options.l2 ? "line2" : "line1");
  };

  const toFind = () => {
    update({
      mode: "find",
      sum: null,
      draft: getBlank(),
      q: "",
      open: false,
      l2: false,
      touched: {},
    });
    emit(null);
    focusLater("q");
  };

  const hits = state.mode === "find" ? searchAddresses(state.q) : [];
  const isOpen = state.open && state.q.trim().length >= 3;
  const isErrorShown = (key: FieldKey | "q") =>
    !!(showErrors || state.touched[key]);
  const queryError =
    state.mode === "find" && isErrorShown("q") && !value?.line1
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
      if (count) update({ idx: (state.idx + 1) % count });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (count) update({ idx: state.idx <= 0 ? count - 1 : state.idx - 1 });
    } else if (event.key === "Enter") {
      event.preventDefault();
      const chosen = hits[state.idx];
      if (isOpen && state.idx >= 0 && chosen) pick(chosen);
      else if (isOpen && count === 1 && hits[0]) pick(hits[0]);
    } else if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      update({ open: false, idx: -1 });
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
      update({ q: event.target.value, open: true, idx: -1 }),
    handleQueryFocus: () => {
      window.clearTimeout(blurTimerRef.current);
      if (state.q.trim().length >= 3) update({ open: true });
    },
    handleQueryBlur: () => {
      blurTimerRef.current = window.setTimeout(
        () => update({ open: false, idx: -1 }),
        120,
      );
    },
    clearQuery: () => {
      update({ q: "", open: false, idx: -1 });
      focusLater("q");
    },
    setActiveIndex: (index: number) => {
      if (state.idx !== index) update({ idx: index });
    },
  };
};
