// AccountSettings demo data, validators and display tables.
import type { TaxDetails } from "../tax-details-form/tax-details-logic";

export type SettingsPage =
  "personal" | "security" | "notifications" | "payouts" | "calendar";
export type PayoutStatus =
  "none" | "verifying" | "action" | "paused" | "active";
export type SignIn = "email" | "google" | "apple";

export interface TwoFactorDevice {
  name: string;
  backup: boolean;
}

interface SettingsSession {
  id: string;
  device: string;
  location: string;
  last: string;
  isCurrent?: boolean;
  kind: "phone" | "laptop" | "tablet";
}

export interface ChannelSetting {
  email: boolean;
  sms: boolean;
}

export type NotificationKey =
  | "newBooking"
  | "clientCancelled"
  | "clientRescheduled"
  | "paymentPaid"
  | "paymentFailed"
  | "feeCharged"
  | "feeFailed"
  | "autoCancelSoon"
  | "autoCancelled"
  | "reviewReceived";

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
  emailTouched: boolean;
  pendingEmail: string;
  /** The codes sent to the current and the new address. */
  emailCodes: { current: string; next: string };
  isCurrentEmailConfirmed: boolean;
  emailError: string;
  phone: string;
  phoneFlow: "edit" | null;
  newPhone: string;
  phoneError: string;
  isSettingPassword: boolean;
  /** `code` is the one emailed to confirm it's them. */
  password: { code: string; next: string; confirm: string };
  isPasswordCodeSent: boolean;
  passwordError: string;
  passwordTouched: boolean;
  newPasswordBlurred: boolean;
  signOthers: boolean;
  sessions: SettingsSession[];
  sessionsLoading: boolean;
  alerts: boolean;
  notifications: Record<NotificationKey, ChannelSetting>;
  google: {
    state: "off" | "connecting" | "on";
    calendars: Record<"main" | "family" | "holidays", boolean>;
    target: string;
  };
  icsToken: string;
  toast: boolean;
  toastText: string;
}

export interface SettingsPerson {
  first: string;
  last: string;
  email: string;
  phone: string;
}

const DEMO_PERSON: SettingsPerson = {
  first: "Amara",
  last: "Okonkwo",
  email: "amara.okonkwo@gmail.com",
  phone: "07700 900418",
};

/** ?pwnew= prefills the new password (and the current one) for the meter boards. */
export const EMPTY_PASSWORD = { code: "", next: "", confirm: "" };

export type NotificationSettings = Record<NotificationKey, ChannelSetting>;

export const getInitialSettingsState = (
  isNew: boolean,
  search: string,
  { first, last, email, phone }: SettingsPerson = DEMO_PERSON,
  savedNotifications: Partial<NotificationSettings> = {},
): SettingsState => {
  const prefilled = new URLSearchParams(search).get("pwnew") || "";
  const channel = (): ChannelSetting => ({ email: true, sms: false });

  return {
    first,
    last,
    savedName: [first, last],
    nameTouched: false,
    email,
    emailFlow: null,
    newEmail: "",
    emailTouched: false,
    pendingEmail: "",
    emailCodes: { current: "", next: "" },
    isCurrentEmailConfirmed: false,
    emailError: "",
    phone,
    phoneFlow: null,
    newPhone: "",
    phoneError: "",
    isSettingPassword: false,
    password: { code: prefilled ? "123456" : "", next: prefilled, confirm: "" },
    isPasswordCodeSent: !!prefilled,
    passwordError: "",
    passwordTouched: false,
    newPasswordBlurred: false,
    signOthers: true,
    sessions: [
      {
        id: "s1",
        device: "iPhone 15, Safari",
        location: "Manchester, UK",
        last: "Active now",
        isCurrent: true,
        kind: "phone",
      },
      {
        id: "s2",
        device: "MacBook Air, Chrome",
        location: "Manchester, UK",
        last: "2 hours ago",
        kind: "laptop",
      },
      {
        id: "s3",
        device: "iPad, Safari",
        location: "Salford, UK",
        last: "3 days ago",
        kind: "tablet",
      },
    ],
    sessionsLoading: false,
    alerts: true,
    notifications: {
      newBooking: channel(),
      clientCancelled: channel(),
      clientRescheduled: channel(),
      paymentPaid: channel(),
      paymentFailed: channel(),
      feeCharged: channel(),
      feeFailed: channel(),
      autoCancelSoon: channel(),
      autoCancelled: channel(),
      reviewReceived: channel(),
      ...savedNotifications,
    },
    google: {
      state: isNew ? "off" : "on",
      calendars: { main: true, family: true, holidays: false },
      target: "new",
    },
    icsToken: "7f3k29xq",
    toast: false,
    toastText: "",
  };
};

/** Why the account can't be closed yet, else "". */
export const getCloseReason = (upcoming: number, owed: boolean): string => {
  if (upcoming)
    return `You have ${upcoming} upcoming booking${upcoming === 1 ? "" : "s"}. Cancel or complete them first.`;

  return owed
    ? "You have money owed on your account. Settle it in Payouts first."
    : "";
};

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
      ["newBooking", "New booking"],
      ["clientCancelled", "Client cancelled"],
      ["clientRescheduled", "Client rescheduled"],
    ],
  ],
  [
    "Payments",
    [
      ["paymentPaid", "Deposit or payment link paid"],
      ["paymentFailed", "Payment failed"],
      ["feeCharged", "Fee charged"],
      ["feeFailed", "Fee failed"],
    ],
  ],
  [
    "Awaiting confirmation",
    [
      ["autoCancelSoon", "1 hour before auto-cancel"],
      ["autoCancelled", "Auto-cancelled"],
    ],
  ],
  ["Reviews", [["reviewReceived", "Review received"]]],
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

interface PayoutStatusView {
  title: string;
  body: string;
  icon: string;
  foreground: string;
  background: string;
  chip: string;
  buttonLabel: string;
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
      foreground: INK,
      background: "#fff",
      chip: "var(--fill-quiet)",
      buttonLabel: "Connect Stripe",
      primary: true,
    },
    verifying: {
      title: "Stripe is checking your details",
      body: "We’ll let you know when it’s done. You can keep taking bookings.",
      icon: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
      foreground: INK,
      background: "#fff",
      chip: "var(--fill-quiet)",
      buttonLabel: "View in Stripe",
    },
    action: {
      title: "Stripe needs more information",
      body: "Finish the missing steps so your payouts keep running.",
      icon: "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17v.01",
      foreground: "#7a3511",
      background: "rgba(181,84,31,.13)",
      chip: "rgba(181,84,31,.16)",
      buttonLabel: "Continue in Stripe",
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
      foreground: "var(--accent-700)",
      background: "var(--accent-wash)",
      chip: "rgba(143,17,18,.10)",
      buttonLabel: "View in Stripe",
      flat: true,
    },
    active: {
      title: "Payouts active",
      body: "Stripe pays out to your bank automatically.",
      icon: "M5 12.5l4.5 4.5L19 7.5",
      foreground: "#2f6b3e",
      background: "#fff",
      chip: "rgba(47,107,62,.12)",
      buttonLabel: "View in Stripe",
    },
  })[status];

/** The saved tax details as rows (NI number and date of birth masked). */
export const getTaxRows = (
  tax: Partial<TaxDetails>,
): { label: string; value: string; isSpaced: boolean }[] => {
  const mask = (nationalInsuranceNumber?: string) =>
    nationalInsuranceNumber
      ? `•• •• •• ${nationalInsuranceNumber.slice(6, 8)} ${nationalInsuranceNumber.slice(8)}`
      : "";

  const address = tax.address
    ? [tax.address.line1, tax.address.postcode].filter(Boolean).join(", ")
    : "";

  const rows =
    tax.kind === "ltd"
      ? [
          { label: "Company name", value: tax.companyName ?? "" },
          { label: "Company number", value: tax.companyNumber ?? "" },
          { label: "Registered office", value: address },
        ]
      : [
          { label: "Legal name", value: tax.legalName ?? "" },
          { label: "Date of birth", value: `•• / •• / ${tax.year}` },
          { label: "Home address", value: address },
          {
            label: "National Insurance number",
            value: mask(tax.nationalInsuranceNumber),
          },
        ];

  return rows.map((row) => ({
    ...row,
    isSpaced: row.label === "National Insurance number",
  }));
};
