// AccountSettings demo data, validators and display tables (prototype AccountSettings.dc.html init() and renderVals()).
import type { TaxDetails } from "../tax-details-form/tax-details-logic";

export type SettingsPage =
  "personal" | "security" | "notifications" | "payouts" | "calendar";
export type PayoutStatus =
  "none" | "verifying" | "action" | "paused" | "active";
export type SignIn = "email" | "google" | "apple";

export interface TfaDevice {
  name: string;
  backup: boolean;
}

export interface SettingsSession {
  id: string;
  device: string;
  loc: string;
  last: string;
  cur?: boolean;
  kind: "phone" | "laptop" | "tablet";
}

export interface ChannelSetting {
  e: boolean;
  s: boolean;
}

export type NotificationKey =
  "nb" | "cc" | "cr" | "pd" | "pf" | "fc" | "ff" | "ac1" | "acx" | "rv";

export interface ConfirmDialog {
  title: string;
  body: string;
  cta: string;
}

export interface SettingsState {
  first: string;
  last: string;
  savedName: [string, string];
  nameTouched: boolean;
  email: string;
  emailFlow: "edit" | null;
  newEmail: string;
  emailPw: string;
  emailTouched: boolean;
  pendingEmail: string;
  phone: string;
  phoneFlow: "edit" | "code" | null;
  newPhone: string;
  code: string;
  phoneErr: string;
  setPw: boolean;
  pw: { cur: string; nw: string; conf: string };
  pwTouched: boolean;
  pwNwBlur: boolean;
  signOthers: boolean;
  tfaDevs: TfaDevice[];
  sessions: SettingsSession[];
  sessLoading: boolean;
  alerts: boolean;
  notif: Record<NotificationKey, ChannelSetting>;
  ni: string;
  niEdit: boolean;
  niInput: string;
  niTouched: boolean;
  g: {
    state: "off" | "connecting" | "on";
    cals: Record<"main" | "fam" | "hol", boolean>;
    target: string;
  };
  icsToken: string;
  toast: boolean;
  toastText: string;
}

/** ?pwnew= prefills the new password (and the current one) for the meter boards. */
export const getInitialSettingsState = (
  isNew: boolean,
  search: string,
): SettingsState => {
  const prefilled = new URLSearchParams(search).get("pwnew") || "";
  const channel = (): ChannelSetting => ({ e: true, s: false });
  return {
    first: "Amara",
    last: "Okonkwo",
    savedName: ["Amara", "Okonkwo"],
    nameTouched: false,
    email: "amara.okonkwo@gmail.com",
    emailFlow: null,
    newEmail: "",
    emailPw: "",
    emailTouched: false,
    pendingEmail: "",
    phone: "07700 900418",
    phoneFlow: null,
    newPhone: "",
    code: "",
    phoneErr: "",
    setPw: false,
    pw: { cur: prefilled ? "sunflower9" : "", nw: prefilled, conf: "" },
    pwTouched: false,
    pwNwBlur: false,
    signOthers: true,
    tfaDevs: [],
    sessions: [
      {
        id: "s1",
        device: "iPhone 15, Safari",
        loc: "Manchester, UK",
        last: "Active now",
        cur: true,
        kind: "phone",
      },
      {
        id: "s2",
        device: "MacBook Air, Chrome",
        loc: "Manchester, UK",
        last: "2 hours ago",
        kind: "laptop",
      },
      {
        id: "s3",
        device: "iPad, Safari",
        loc: "Salford, UK",
        last: "3 days ago",
        kind: "tablet",
      },
    ],
    sessLoading: false,
    alerts: true,
    notif: {
      nb: channel(),
      cc: channel(),
      cr: channel(),
      pd: channel(),
      pf: channel(),
      fc: channel(),
      ff: channel(),
      ac1: channel(),
      acx: channel(),
      rv: channel(),
    },
    ni: isNew ? "" : "QQ123456C",
    niEdit: false,
    niInput: "",
    niTouched: false,
    g: {
      state: isNew ? "off" : "on",
      cals: { main: true, fam: true, hol: false },
      target: "new",
    },
    icsToken: "7f3k29xq",
    toast: false,
    toastText: "",
  };
};

export const isEmailValid = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export const isMobileValid = (value: string): boolean =>
  /^(?:\+44|0)7\d{9}$/.test(value.replace(/[\s()-]/g, ""));

export const isNiValid = (compact: string): boolean =>
  /^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/.test(compact);

/** Why the account can't be closed yet, else "". */
export const getCloseReason = (upcoming: number, owed: boolean): string =>
  upcoming
    ? "You have " +
      upcoming +
      " upcoming booking" +
      (upcoming === 1 ? "" : "s") +
      ". Cancel or complete them first."
    : owed
      ? "You have money owed on your account. Settle it in Payouts first."
      : "";

export const SESSION_ICONS: Record<SettingsSession["kind"], string> = {
  phone:
    "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2",
  laptop: "M4 5h16v10H4zM2 19h20",
  tablet:
    "M5 2h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2",
};

export const NOTIFICATION_GROUPS: [string, [NotificationKey, string][]][] = [
  [
    "Bookings",
    [
      ["nb", "New booking"],
      ["cc", "Client cancelled"],
      ["cr", "Client rescheduled"],
    ],
  ],
  [
    "Payments",
    [
      ["pd", "Deposit or payment link paid"],
      ["pf", "Payment failed"],
      ["fc", "Fee charged"],
      ["ff", "Fee failed"],
    ],
  ],
  [
    "Awaiting confirmation",
    [
      ["ac1", "1 hour before auto-cancel"],
      ["acx", "Auto-cancelled"],
    ],
  ],
  ["Reviews", [["rv", "Review received"]]],
];

export const ALWAYS_ON = [
  "Payout paid or failed",
  "Stripe needs action",
  "Security alerts",
];

export const CLIENT_MESSAGES = [
  "Booking confirmation",
  "Payment link",
  "Reschedule or cancellation notice",
  "Fee notice and outcome",
  "Receipt",
  "Reminders",
  "Review request",
];

export interface PayoutStatusView {
  title: string;
  body: string;
  icon: string;
  fg: string;
  bg: string;
  chip: string;
  btn: string;
  primary?: boolean;
  flat?: boolean;
}

const INK = "var(--neutral-900,#1a1714)";

export const getPayoutStatus = (
  status: PayoutStatus,
  pauseReason?: string,
): PayoutStatusView =>
  ({
    none: {
      title: "Not connected",
      body: "Connect Stripe to take deposits and get paid.",
      icon: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM8 12h8",
      fg: INK,
      bg: "#fff",
      chip: "var(--fill-quiet)",
      btn: "Connect Stripe",
      primary: true,
    },
    verifying: {
      title: "Stripe is checking your details",
      body: "We’ll let you know when it’s done. You can keep taking bookings.",
      icon: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
      fg: INK,
      bg: "#fff",
      chip: "var(--fill-quiet)",
      btn: "View in Stripe",
    },
    action: {
      title: "Stripe needs more information",
      body: "Finish the missing steps so your payouts keep running.",
      icon: "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17v.01",
      fg: "#7a3511",
      bg: "rgba(181,84,31,.13)",
      chip: "rgba(181,84,31,.16)",
      btn: "Continue in Stripe",
      primary: true,
      flat: true,
    },
    paused: {
      title: "Payouts paused",
      body:
        pauseReason === "review"
          ? "Your account is under review. Stripe will email you if they need anything."
          : "A negative balance is being recovered from your payouts.",
      icon: "M10 15V9M14 15V9M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
      fg: "var(--accent-700)",
      bg: "var(--accent-wash)",
      chip: "rgba(143,17,18,.10)",
      btn: "View in Stripe",
      flat: true,
    },
    active: {
      title: "Payouts active",
      body: "Stripe pays out to your bank automatically.",
      icon: "M5 12.5l4.5 4.5L19 7.5",
      fg: "#2f6b3e",
      bg: "#fff",
      chip: "rgba(47,107,62,.12)",
      btn: "View in Stripe",
    },
  })[status];

/** The saved tax details as rows (NI number and date of birth masked). */
export const getTaxRows = (
  tax: Partial<TaxDetails>,
): { label: string; value: string; isSpaced: boolean }[] => {
  const mask = (ni?: string) =>
    ni ? "•• •• •• " + ni.slice(6, 8) + " " + ni.slice(8) : "";
  const address = tax.addr
    ? [tax.addr.line1, tax.addr.pc].filter(Boolean).join(", ")
    : "";
  const rows =
    tax.kind === "ltd"
      ? [
          { label: "Company name", value: tax.coName ?? "" },
          { label: "Company number", value: tax.coNum ?? "" },
          { label: "Registered office", value: address },
        ]
      : [
          { label: "Legal name", value: tax.legalName ?? "" },
          { label: "Date of birth", value: "•• / •• / " + tax.y },
          { label: "Home address", value: address },
          { label: "National Insurance number", value: mask(tax.ni) },
        ];
  return rows.map((row) => ({
    ...row,
    isSpaced: row.label === "National Insurance number",
  }));
};
