// AccountSettings state, validators and display tables.
import type { NameValues } from "./name-schema";
import { Laptop, Smartphone, Tablet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  alerts: boolean | null;
  notifications: Record<NotificationKey, ChannelSetting>;
  feedUrl: string;
  feedFailed: boolean;
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
    alerts: null,
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
    feedUrl: "",
    feedFailed: false,
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
    ? `You owe ${formatMoney(owed, { pence: "always" })} in fees. Pay it to close your business.`
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
