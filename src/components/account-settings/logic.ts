// AccountSettings state, stand-in calendar values, validators and display tables.
import type { NameValues } from "./name-schema";
import {
  Check,
  CircleMinus,
  CirclePause,
  Clock,
  Laptop,
  Smartphone,
  Tablet,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TaxDetails } from "../tax-details-form/logic";
import { formatMoney } from "../../utils/money";

export type SettingsPage =
  "personal" | "security" | "notifications" | "payouts" | "calendar";
export type PayoutStatus =
  "none" | "verifying" | "action" | "paused" | "active";
export type SignIn = "email" | "google" | "apple";

export interface TwoFactorDevice {
  name: string;
  backup: boolean;
}

export interface SettingsSession {
  id: string;
  device: string;
  signedIn: string;
  last: string;
  isCurrent: boolean;
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
  email: string;
  emailFlow: "edit" | null;
  pendingEmail: string;
  isCurrentEmailConfirmed: boolean;
  phone: string;
  phoneFlow: "edit" | null;
  isSettingPassword: boolean;
  isPasswordCodeSent: boolean;
  signOthers: boolean;
  sessions: SettingsSession[];
  sessionsLoading: boolean;
  sessionsFailed: boolean;
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

export const getInitialName = ({
  first,
  last,
}: SettingsPerson): NameValues => ({ first, last });

export type NotificationSettings = Record<NotificationKey, ChannelSetting>;

export const getInitialSettingsState = (
  { email, phone }: SettingsPerson,
  savedNotifications: Partial<NotificationSettings> = {},
): SettingsState => {
  const channel = (): ChannelSetting => ({ email: true, sms: false });

  return {
    email,
    emailFlow: null,
    pendingEmail: "",
    isCurrentEmailConfirmed: false,
    phone,
    phoneFlow: null,
    isSettingPassword: false,
    isPasswordCodeSent: false,
    signOthers: true,
    sessions: [],
    sessionsLoading: false,
    sessionsFailed: false,
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
      state: "off",
      calendars: { main: true, family: true, holidays: false },
      target: "new",
    },
    icsToken: "7f3k29xq",
    toast: false,
    toastText: "",
  };
};

/** Why the account can't be closed yet, else "". */
export const getCloseReason = (
  upcoming: number,
  owed: number,
  hasOpenDispute: boolean,
): string => {
  if (upcoming)
    return `You have ${upcoming} upcoming booking${upcoming === 1 ? "" : "s"}. Cancel or complete them first.`;

  if (hasOpenDispute)
    return "A client’s dispute is still open. You can close once their bank decides.";

  return owed
    ? `You owe ${formatMoney(owed, { pence: "always" })} in dispute fees. Pay it to close your business.`
    : "";
};

export const SESSION_ICONS: Record<SettingsSession["kind"], LucideIcon> = {
  phone: Smartphone,
  laptop: Laptop,
  tablet: Tablet,
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
  icon: LucideIcon;
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
      icon: CircleMinus,
      foreground: INK,
      background: "#fff",
      chip: "var(--fill-quiet)",
      buttonLabel: "Connect Stripe",
      primary: true,
    },
    verifying: {
      title: "Stripe is checking your details",
      body: "We’ll let you know when it’s done. You can keep taking bookings.",
      icon: Clock,
      foreground: INK,
      background: "#fff",
      chip: "var(--fill-quiet)",
      buttonLabel: "View in Stripe",
    },
    action: {
      title: "Stripe needs more information",
      body: "Finish the missing steps so your payouts keep running.",
      icon: TriangleAlert,
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
      icon: CirclePause,
      foreground: "var(--accent-700)",
      background: "var(--accent-wash)",
      chip: "rgba(143,17,18,.10)",
      buttonLabel: "View in Stripe",
      flat: true,
    },
    active: {
      title: "Payouts active",
      body: "Stripe pays out to your bank automatically.",
      icon: Check,
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
