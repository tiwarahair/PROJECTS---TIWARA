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

/** The confirmed booking, as the server has it. */
interface BookedTimes {
  ref: string;
  startsAt: string;
  endsAt: string;
}

interface AccountSave {
  saved: boolean;
  hidden: boolean;
  sent: boolean;
  sentAt: number;
}

export interface AllergyState {
  on: boolean;
  text: string;
  prior: boolean;
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
  details: Details;
  appointmentAddress: BookingAddress;
  holdUntil: number | null;
  holdId?: string;
  holdSecret?: string;
  guest?: boolean;
}

export type FieldKey = "address" | "first" | "last" | "email" | "phone";
type LegalDocumentKind = "terms" | "privacy";

export interface BookingState {
  id: string;
  serviceId: string;
  step: number;
  selection: Selection;
  showPrev: boolean;
  calendarMonth: number;
  calendarYear: number;
  date: number | null;
  time: string | null;
  details: Details;
  photos: Photo[];
  /** A signed-in client asked to save the card for future bookings. */
  keepCard: boolean;
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
  appointmentAddress: BookingAddress;
  legalDocument: LegalDocumentKind | null;
  leave: string | null;
  payKind: string;
  account: AccountSave;
  resumeDraft: BookingDraft | null;
  repickNote: boolean;
  paying: boolean;
  /** Paid; waiting for the server to confirm the booking. */
  confirming: boolean;
  booked: BookedTimes | null;
  payError: string;
  confirmed: boolean;
  allergy: AllergyState;
  saved: SavedAddress[];
  selectedAddressId: string;
  sizeGuide: boolean;
}

export type StatePatch =
  Partial<BookingState> | ((state: BookingState) => Partial<BookingState>);
