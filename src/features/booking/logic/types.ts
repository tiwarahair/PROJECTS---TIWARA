// The booking flow's state and its parts.
import type { SavedAddress } from "../../../types/address";

export interface Selection {
  size: string | null;
  length: string | null;
  colour: string;
  own: Record<string, string | undefined>;
  addons: string[];
}

export interface Details {
  first: string;
  last: string;
  email: string;
  phone: string;
  notes: string;
}

export interface PayFields {
  number: string;
  expiry: string;
  cvc: string;
  name: string;
  postcode: string;
  future: boolean;
}

export interface BookingAddress {
  postcode: string;
  line1: string;
  line2: string;
  town: string;
  notes: string;
  source: string;
  /** Google's point for the address (picked from suggestions); null until known. */
  lat: number | null;
  lng: number | null;
}

/** The server's hold on the chosen time (dev boards fake one with empty id and secret). */
interface Hold {
  id: string;
  secret: string;
  until: number;
}

interface AccountSave {
  password: string;
  show: boolean;
  error: string;
  saved: boolean;
  hidden: boolean;
  sent: boolean;
  sentAt: number;
}

export interface AllergyState {
  on: boolean;
  text: string;
  prior: boolean;
  editing: boolean;
  focus: boolean;
}

interface Photo {
  name: string;
  url: string;
}

export interface BookingDraft {
  at: number;
  step: number;
  serviceId: string;
  selection: Selection;
  calendarMonth: number;
  calendarYear: number;
  date: number | null;
  time: string | null;
  details: Omit<Details, "notes"> & { notes: string };
  appointmentAddress: BookingAddress;
  holdUntil: number | null;
  holdId?: string;
  holdSecret?: string;
  guest?: boolean;
}

export type FieldKey = "address" | "first" | "last" | "email" | "phone";
type LegalDocumentKind = "terms" | "privacy";
type TurnstileState = "idle" | "checking" | "passed" | "fail";

export interface BookingState {
  id: string;
  serviceId: string;
  step: number;
  policyOpen: boolean;
  selection: Selection;
  showPrev: boolean;
  calendarMonth: number;
  calendarYear: number;
  date: number | null;
  time: string | null;
  details: Details;
  photos: Photo[];
  pay: PayFields;
  loggedIn: boolean;
  guest: boolean;
  editContact: boolean;
  loginStart: "choice" | "email" | null;
  board: boolean;
  holdSeconds: number;
  hold: Hold | null;
  holding: boolean;
  /** Why the chosen time couldn't be held: taken by someone else, or anything else. */
  holdError: "taken" | "failed" | null;
  holdExpired: boolean;
  taken: boolean;
  appointmentAddress: BookingAddress;
  legalDocument: LegalDocumentKind | null;
  leave: string | null;
  bank: boolean;
  wallet: string | null;
  payKind: string;
  account: AccountSave;
  resumeDraft: BookingDraft | null;
  repickNote: boolean;
  turnstileMode: "challenge" | "fail" | null;
  turnstileStatus: TurnstileState;
  paying: boolean;
  payError: string;
  confirmed: boolean;
  allergy: AllergyState;
  saved: SavedAddress[];
  selectedAddressId: string;
  sizeGuide: boolean;
}

export type StatePatch =
  Partial<BookingState> | ((state: BookingState) => Partial<BookingState>);
