import type { SavedAddress } from "../../types/address";
import type { AccountBooking, Profile, SavedCard } from "./data";
import type { EditKey } from "./logic";

export type DialogState =
  | { kind: "receipt"; id: string }
  | { kind: "discard"; then: () => void; keep?: () => void }
  | { kind: "allergy"; index: number }
  | { kind: "card"; id: string }
  | { kind: "address"; id: string }
  | { kind: "addCard" | "logoutAll" | "sync" | "cookies" | "delete" };

export interface AddressForm {
  mode: "add" | "edit";
  id?: string;
}

export interface PasswordState {
  has: boolean;
  open: boolean;
  show: boolean;
  changed?: boolean;
}

export interface AccountState {
  fixture: string;
  sectionId: string | null;
  wide: boolean;
  dialog: DialogState | null;
  toast: string;
  bookings: AccountBooking[];
  bookingsTab?: "up" | "past";
  entries: { id: string; text: string }[];
  allergyEdit: number;
  allergyDraft: string;
  profile: Profile;
  photo: string | null;
  photoError: string;
  quiz: boolean;
  edit: EditKey | null;
  emailStep: "" | "code";
  pendingEmail?: string;
  code: string[];
  codeError: string;
  shake: number;
  resendIn: number;
  password: PasswordState;
  googleConnected: boolean;
  appleConnected: boolean;
  cards: SavedCard[];
  addresses: SavedAddress[];
  addressForm: AddressForm | null;
  addressMenu?: string | null;
  marketing: boolean;
  sync: string;
  cookies: { analytics: boolean; marketing: boolean };
  cookiesDraft: { analytics: boolean; marketing: boolean };
  deleteText: string;
  loggedOut: boolean;
  deleted: boolean;
}

export type StatePatch =
  Partial<AccountState> | ((state: AccountState) => Partial<AccountState>);

export interface AccountProps {
  section?: string;
  fixture?: string;
  /** Hair quiz taken (?quiz=0|1). */
  hairQuiz?: boolean;
  /** Has a profile photo (?photo=0|1). */
  photo?: boolean;
  /** Marketing emails on (?mkt=0|1). */
  marketing?: boolean;
}

export const EMPTY_CODE = ["", "", "", "", "", ""];
export const CORRECT_CODE = "123456";
export const EXPIRED_CODE = "000000";
export const TOAST_MS = 3200;
export const WIDE_PX = 960;

// Card brand by the number's first digit
export const CARD_BRANDS: Record<string, string> = {
  "4": "Visa",
  "5": "Mastercard",
  "3": "Amex",
};

export const EMPTY_PROFILE = { first: "", last: "", email: "", mobile: "" };
