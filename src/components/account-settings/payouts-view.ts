import {
  Check,
  CircleMinus,
  CirclePause,
  Clock,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TaxDetails } from "../tax-details-form/logic";
import type { PayoutStatus } from "./logic";

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
