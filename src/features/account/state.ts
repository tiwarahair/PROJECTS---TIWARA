import type { Profile } from "./data";
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

/** the email change sends one code to the current address and one to the new one. */
export type CodeTarget = "current" | "next";

export interface CodeRow {
  digits: string[];
  error: string;
  shake: number;
  confirmed: boolean;
}

export interface PasswordState {
  has: boolean;
  open: boolean;
  show: boolean;
  changed?: boolean;
  isCodeSent: boolean;
  signOthers: boolean;
}

export interface AccountState {
  sectionId: string | null;
  wide: boolean;
  dialog: DialogState | null;
  toast: string;
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
  codes: Record<CodeTarget, CodeRow>;
  resendIn: number;
  password: PasswordState;
  googleConnected: boolean;
  appleConnected: boolean;
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
}

export const EMPTY_CODE = ["", "", "", "", "", ""];

const EMPTY_ROW: CodeRow = {
  digits: EMPTY_CODE,
  error: "",
  shake: 0,
  confirmed: false,
};

export const EMPTY_CODES: Record<CodeTarget, CodeRow> = {
  current: EMPTY_ROW,
  next: EMPTY_ROW,
};
export const TOAST_MS = 3200;
export const WIDE_PX = 960;

export const EMPTY_PROFILE = { first: "", last: "", email: "", mobile: "" };
