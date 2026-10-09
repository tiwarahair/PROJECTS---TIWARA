// Booking copy and fixed content: the Privacy / Terms sheets, the size guide, policy sentences and the
// AI preview photo pool (prototype Booking renderVals).
import type { PolicyMode } from "../../types/policy";

export interface DocSection {
  h: string;
  p: string;
}

export const getPrivacySections = (stylistName: string): DocSection[] => [
  {
    h: "What we collect",
    p: "Your name, email and mobile, plus your address if your stylist comes to you. If you choose to share allergies or sensitivities, we keep that only for this booking.",
  },
  {
    h: "Why we use it",
    p:
      "To confirm and manage your booking, send reminders, and let " +
      stylistName +
      " contact you about your appointment. We never sell your details.",
  },
  {
    h: "Who sees it",
    p:
      stylistName +
      " sees what they need for your appointment. Payments are handled by Stripe, so we never see your full card number.",
  },
  {
    h: "How long we keep it",
    p: "Booking records are kept for six years for tax and accounting. You can ask us to delete anything else at any time.",
  },
  {
    h: "Your rights",
    p: "You can ask for a copy of your data, correct it or delete it by emailing privacy@tiwarashouse.co.uk.",
  },
];

export const TERMS_SECTIONS: DocSection[] = [
  {
    h: "Your booking",
    p: "Tiwára's House lets you book directly with independent stylists. Your appointment is an agreement between you and the stylist; we take the booking and process payments on their behalf.",
  },
  {
    h: "Booking fee",
    p: "Each booking carries a booking fee of £0.50 + 1.5% of the service price, shown before you pay. The stylist pays nothing to list.",
  },
  {
    h: "Your stylist's policy",
    p: "Each stylist sets their own deposit, cancellation window and any late-cancellation or no-show fees. The policy shown at Review is the one that applies to your booking, even if the stylist changes it later.",
  },
  {
    h: "Saved cards and fees",
    p: "Where a stylist's policy needs a saved card, we keep it securely with Stripe for that booking's balance and any fees under the policy. We'll email you before any fee is charged.",
  },
  {
    h: "Changes and cancellations",
    p: "Use the link in your confirmation email to reschedule or cancel. Refunds follow the stylist’s policy and go back to the card you paid with.",
  },
];

export interface SizeGuideEntry {
  name: string;
  desc: string;
  /** Braid width in px; the diagram repeats it max(2, round(190 / (w + 8))) times. */
  w: number;
  gap: number;
  popular: boolean;
}

export const SIZE_GUIDE: SizeGuideEntry[] = [
  {
    name: "Small",
    desc: "Micro / pencil-width parting. More braids, longer install, delicate finish.",
    w: 5,
    gap: 11,
    popular: false,
  },
  {
    name: "Medium",
    desc: "Standard parting. Full look, great longevity — perfect for most clients.",
    w: 12,
    gap: 22,
    popular: true,
  },
  {
    name: "Large",
    desc: "Chunky parting. Bold statement look, quicker install time.",
    w: 24,
    gap: 42,
    popular: false,
  },
];

export const getBarCount = (width: number): number =>
  Math.max(2, Math.round(190 / (width + 8)));

export const getPaySub = (
  mode: PolicyMode,
  balance: string,
  price: string,
  stylistName: string,
): string =>
  mode === "deposit"
    ? "The " +
      balance +
      " balance is paid to " +
      stylistName +
      " at your appointment."
    : mode === "full"
      ? "Nothing more to pay at your appointment."
      : "The " + price + " is paid to " + stylistName + " at your appointment.";

export const getPayIntro = (mode: PolicyMode, depositPct: number): string =>
  mode === "deposit"
    ? "That's your " + depositPct + "% deposit plus the booking fee."
    : mode === "full"
      ? "That's the full price plus the booking fee."
      : "That's the booking fee.";

export const getCancelSentence = (mode: PolicyMode, windowText: string) =>
  mode === "none"
    ? "Please cancel or reschedule at least " +
      windowText +
      " before your appointment."
    : "Free cancellation up to " + windowText + " before your appointment.";

// AI preview: knotless braid renders by length and colour. The prototype also pooled five reference photos
// from uploads/ (not in the handoff bundle) for other braids; dropped, so the preview is knotless-only.
const AI_KEYS = [
  "bob-1b",
  "bob-30",
  "bob-33",
  "bob-4",
  "bob-613",
  "bra-1b",
  "bra-30",
  "bra-33",
  "bra-4",
  "bra-613",
  "shoulder-1b",
  "shoulder-30",
  "shoulder-4",
  "shoulder-613",
  "waist-1b",
  "waist-30",
  "waist-33",
  "waist-4",
  "waist-613",
];

export const PREVIEW_POOL = AI_KEYS.map(
  (key) => "img/ai-knotless-" + key + ".webp",
);

/** Only services with the knotless lengths (Bob … Waist) have renders to preview. */
export const hasPreview = (lengthLabels: string[]): boolean =>
  lengthLabels.includes("Bob");

/** Index into PREVIEW_POOL for the chosen length and colour (unknown colours fall back to 1B). */
export const getPreviewIndex = (
  length: string | null,
  colour: string,
): number => {
  const lengthValue = String(length || "").toLowerCase();
  const aiLength = lengthValue.startsWith("bob")
    ? "bob"
    : lengthValue.startsWith("bra")
      ? "bra"
      : lengthValue.startsWith("waist")
        ? "waist"
        : "shoulder";
  const colourValue =
    String(colour || "")
      .toLowerCase()
      .split(" ")[0] ?? "";
  const aiColour = ["30", "33", "4", "613"].includes(colourValue)
    ? colourValue
    : "1b";
  const aiKey = aiLength + "-" + aiColour;
  return AI_KEYS.indexOf(AI_KEYS.includes(aiKey) ? aiKey : aiLength + "-1b");
};
