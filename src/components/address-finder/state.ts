import type { PlaceAddress } from "../../lib/google-maps";
import {
  formatPostcode,
  getDistrict,
  isPostcodeValid,
  toSegments,
} from "../../utils/address";
import { DEMO_ADDRESS } from "./data";
import type {
  AddressDraft,
  AddressFinderValue,
  AddressFixture,
  AddressSource,
  AddressSuggestion,
  EmittedAddress,
  FieldKey,
  FinderState,
} from "./data";

const getRanges = (text?: google.maps.places.FormattableText | null) =>
  (text?.matches ?? []).map(({ startOffset, endOffset }): [number, number] => [
    startOffset,
    endOffset,
  ]);

export const toSuggestion = (
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

export const getBlank = (): AddressDraft => ({
  line1: "",
  line2: "",
  town: "",
  postcode: "",
});

export const hasAddress = (value?: AddressFinderValue | null) =>
  !!(value && (value.line1 || value.postcode));

export const toDraft = (value: AddressFinderValue): AddressDraft => ({
  line1: value.line1 || "",
  line2: value.line2 || "",
  town: value.town || "",
  postcode: value.postcode || "",
});

export const getInitialState = (
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

  if (value && hasAddress(value)) {
    const draft = toDraft(value);

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

export const toEmittedAddress = (
  address: AddressDraft,
  source?: AddressSource,
  place?: PlaceAddress,
): EmittedAddress => ({
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

export const getManualDraft = (
  sum: AddressDraft | null,
  query: string,
): AddressDraft => {
  const draft = sum ? { ...sum } : getBlank();

  if (!sum && query && isPostcodeValid(query))
    draft.postcode = formatPostcode(query);
  else if (!sum && query && !/^[A-Z]{1,2}\d/i.test(query.trim()))
    draft.line1 = query.trim();

  return draft;
};

export const getFieldErrors = (
  draft: AddressDraft,
): Record<FieldKey, string> => ({
  line1: !draft.line1.trim() ? "Enter the first line of the address" : "",
  line2: "",
  town: !draft.town.trim() ? "Enter a town or city" : "",
  postcode: !isPostcodeValid(draft.postcode)
    ? "Enter a real UK postcode, like M4 6AJ"
    : "",
});
