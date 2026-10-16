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
  lat: number | null;
  lng: number | null;
}

interface Hold {
  id: string;
  secret: string;
  until: number;
}

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
  keepCard: boolean;
  loggedIn: boolean;
  guest: boolean;
  editContact: boolean;
  loginStart: "choice" | "email" | null;
  board: boolean;
  holdSeconds: number;
  hold: Hold | null;
  holding: boolean;
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
