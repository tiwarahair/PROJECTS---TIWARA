// Onboarding constants (types, categories, sources, radii, photos, names, the benefit carousel,
// chooser cards and terms sheets).

import {
  Armchair,
  Car,
  Clock,
  Cloud,
  CreditCard,
  Crown,
  DollarSign,
  Dna,
  House,
  Milk,
  Scissors,
  Search,
  Spool,
  Store,
  UserRound,
  WavesVertical,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ChoiceTile {
  key: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
}

export const BUSINESS_TYPES: ChoiceTile[] = [
  {
    key: "shop",
    title: "Shop / salon",
    subtitle: "Clients come to your premises",
    icon: Store,
  },
  {
    key: "chair",
    title: "Chair rental",
    subtitle: "You rent a chair in a salon",
    icon: Armchair,
  },
  {
    key: "home",
    title: "Home-based",
    subtitle: "Clients come to your home",
    icon: House,
  },
  {
    key: "mobile",
    title: "Mobile",
    subtitle: "You travel to your clients",
    icon: Car,
  },
];

export const CATEGORIES: ChoiceTile[] = [
  {
    key: "braids",
    title: "Braids & Twists",
    subtitle: "Knotless, goddess, fulani, passion twists…",
    icon: Dna,
  },
  {
    key: "wigs",
    title: "Wigs",
    subtitle: "Installs, construction, revamps, customisation",
    icon: Crown,
  },
  {
    key: "weaves",
    title: "Weave extensions & Sew-ins",
    subtitle: "Sew-ins, quick weaves, tape-ins, ponytails",
    icon: Spool,
  },
  {
    key: "locs",
    title: "Locs",
    subtitle: "Starter locs, re-twists, repairs, extensions",
    icon: WavesVertical,
  },
  {
    key: "natural",
    title: "Natural Hair",
    subtitle: "Wash & style, silk press, cornrows, twist outs…",
    icon: Cloud,
  },
  {
    key: "treatments",
    title: "Hair Treatments",
    subtitle: "Colour, deep conditioning, keratin, relaxers…",
    icon: Milk,
  },
];

export const SOURCES = [
  "Recommended by a friend",
  "Another stylist",
  "Instagram",
  "TikTok",
  "Google search",
  "Other",
];

export const RADII = [2, 5, 10, 15, 25];

export const BENEFITS: Omit<ChoiceTile, "key">[] = [
  {
    title: "Take bookings 24/7.",
    subtitle: "Clients book and pay online, even while you’re working.",
    icon: Clock,
  },
  {
    title: "Cut no-shows.",
    subtitle:
      "Take deposits or save a card, with your own cancellation policy.",
    icon: CreditCard,
  },
  {
    title: "Get found.",
    subtitle: "Be listed on Tiwára’s House for clients searching near you.",
    icon: Search,
  },
  {
    title: "Keep your full price.",
    subtitle: "Clients pay the booking fee, not you.",
    icon: DollarSign,
  },
];

export const CHOOSER_ICONS = {
  customer: UserRound,
  pro: Scissors,
};

export const TERMS_BODY = {
  partner: [
    "These terms cover listing your services on Tiwára’s House and using Tiwára’s Studio.",
    "You confirm you have the right to work in the UK, and hold any insurance and licences your services need.",
    "Clients pay a £0.50 + 1.5% booking fee. You keep every penny of your price. Card fees on payments taken through Tiwára’s House are deducted from your payout.",
    "Payouts are made through Stripe. Your legal name and bank details are collected there.",
  ],
  client: [
    "These terms cover booking appointments through Tiwára’s House.",
    "A booking fee of £0.50 + 1.5% is added at checkout. Deposits and cancellation terms are set by each stylist and shown before you pay.",
    "You can cancel or reschedule from your booking link.",
  ],
  privacy: [
    "We collect the details you give us to run bookings and payments.",
    "Stylists see your name, contact details and notes for bookings you make with them.",
    "We never sell your data. You can ask for a copy or deletion at any time.",
  ],
};

export const STORAGE_KEY = "tw_onboarding_v1";
export const MODE_KEY = "tw_ob_mode";

// screens whose server call needs a Turnstile token (verify and forgot-sent add one only once Resend is tapped)
export const TURNSTILE_SCREENS = [
  "cust-email",
  "pro-email",
  "cust-password",
  "pro-password",
  "cust-create",
  "w5",
  "forgot-email",
];

export const RESEND_SCREENS = ["verify", "forgot-sent"];

export type PhotoKey = "welcome" | "client" | "stylist";
export const PHOTOS: Record<PhotoKey, [string, string]> = {
  welcome: ["site/onboarding-welcome.jpg", "center 32%"],
  client: ["site/onboarding-client.jpg", "center 22%"],
  stylist: ["site/onboarding-stylist.jpg", "center 28%"],
};

export const SCREEN_LABELS: Record<string, string> = {
  welcome: "Welcome",
  chooser: "Chooser",
  "cust-email": "Customer email",
  "cust-password": "Customer password",
  "cust-create": "Customer create account",
  "pro-email": "Pro email",
  "pro-password": "Pro password",
  "pro-2fa": "Pro 2FA",
  "forgot-email": "Forgot password",
  "forgot-sent": "Reset link sent",
  "forgot-reset": "New password",
  "forgot-done": "Password updated",
  w1: "Wizard 1 Business type",
  w2: "Wizard 2 Services",
  w3: "Wizard 3 Business details",
  w4: "Wizard 4 Create account",
  w5: "Wizard 5 How did you hear",
  verify: "Verify email",
  "cust-social": "Customer finish account (social)",
  studio: "Opening Studio",
};

export const WIZARD_TITLES: Record<string, string> = {
  w1: "How do you work?",
  w2: "What services do you offer?",
  w3: "Tell us about your business",
  w4: "Create your account",
  w5: "How did you hear about us?",
};

// screens that show the Support / Privacy footer
export const FOOTER_SCREENS = [
  "cust-create",
  "cust-social",
  "cust-email",
  "pro-email",
  "cust-password",
  "pro-password",
  "pro-2fa",
  "verify",
  "forgot-email",
  "forgot-sent",
  "forgot-reset",
  "forgot-done",
];
