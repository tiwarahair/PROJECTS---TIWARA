import type { HighlightSegment } from "../../utils/address";

export type AddressSource = "pick" | "manual";
export type FieldKey = "line1" | "line2" | "town" | "postcode";
export type Mode = "find" | "summary" | "manual";

export interface AddressDraft {
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

export interface FinderState {
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

export interface UseAddressFinderOptions {
  value?: AddressFinderValue | null;
  onChange?: (address: EmittedAddress | null) => void;
  fixture?: AddressFixture;
  showErrors?: boolean;
  autoFocus?: boolean;
}

export const MAX_RESULTS = 5;
export const SEARCH_DELAY_MS = 200;

export const DEMO_ADDRESS: AddressDraft = {
  line1: "14 Blossom Street",
  line2: "",
  town: "Manchester",
  postcode: "M4 6AJ",
};
