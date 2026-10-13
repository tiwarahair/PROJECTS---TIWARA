// Onboarding constants (types, categories, sources, radii, photos, names, the benefit carousel,
// chooser cards and terms sheets).

interface ChoiceTile {
  key: string;
  title: string;
  subtitle: string;
  iconPath: string;
}

export const BUSINESS_TYPES: ChoiceTile[] = [
  {
    key: "shop",
    title: "Shop / salon",
    subtitle: "Clients come to your premises",
    iconPath:
      "M4.5 4h15L21 9H3zM3 9a3 3 0 0 0 6 0a3 3 0 0 0 6 0a3 3 0 0 0 6 0M5 11.5V21h14v-9.5M3 21h18M10 21v-5h4v5",
  },
  {
    key: "chair",
    title: "Chair rental",
    subtitle: "You rent a chair in a salon",
    iconPath:
      "M8 3h8a1 1 0 0 1 1 1v6H7V4a1 1 0 0 1 1-1zM5 10h14v4H5zM12 14v4M8 21h8M12 18v3",
  },
  {
    key: "home",
    title: "Home-based",
    subtitle: "Clients come to your home",
    iconPath: "M3 11 12 3l9 8M5 10v10h14V10M10 20v-6h4v6",
  },
  {
    key: "mobile",
    title: "Mobile",
    subtitle: "You travel to your clients",
    iconPath:
      "M3 16V11l2.2-5h9.3l4 5H21v5M3 16h2M9 16h6M19 16h2M7 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  },
];

export const CATEGORIES: ChoiceTile[] = [
  {
    key: "braids",
    title: "Braids & Twists",
    subtitle: "Knotless, goddess, fulani, passion twists…",
    iconPath: "M8 3c0 4 8 5 8 9s-8 5-8 9M16 3c0 4-8 5-8 9s8 5 8 9",
  },
  {
    key: "wigs",
    title: "Wigs",
    subtitle: "Installs, construction, revamps, customisation",
    iconPath:
      "M12 2.5C7.6 2.5 5.6 5.8 5.6 9.8c0 2.8-.8 5-2.6 6.8 1.4 1 3.2 1 4.4 0-.4 1.8.4 3.4 2 4.4.6-2.4.6-5-.2-7.4-.6-1.8-.8-3.4-.8-4.8 1.8-.6 3-1.8 3.6-3.6M12 2.5c4.4 0 6.4 3.3 6.4 7.3 0 2.8.8 5 2.6 6.8-1.4 1-3.2 1-4.4 0 .4 1.8-.4 3.4-2 4.4-.6-2.4-.6-5 .2-7.4.6-1.8.8-3.4.8-4.8-1.8-.6-3-1.8-3.6-3.6",
  },
  {
    key: "weaves",
    title: "Weave extensions & Sew-ins",
    subtitle: "Sew-ins, quick weaves, tape-ins, ponytails",
    iconPath: "M6 3v13a4 4 0 0 0 8 0V7M16 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0",
  },
  {
    key: "locs",
    title: "Locs",
    subtitle: "Starter locs, re-twists, repairs, extensions",
    iconPath:
      "M6.6 12.6a5.4 5.4 0 0 1 10.8 0v2.6c0 3.3-2.4 5.8-5.4 5.8s-5.4-2.5-5.4-5.8zM6.8 11.4c1.6-.9 3.4-1.3 5.2-1.3s3.6.4 5.2 1.3M6.6 13.8c-.9 0-1.5.7-1.5 1.5s.6 1.5 1.5 1.5M17.4 13.8c.9 0 1.5.7 1.5 1.5s-.6 1.5-1.5 1.5M10.2 7.6c1.2-.5 2.4-.5 3.6 0M12 7.2V2M11 7.2 8 2.8M13 7.2l3-4.4M10 7.6C8 5.6 6 4.8 4.4 5M14 7.6c2-2 4-2.8 5.6-2.6M9.6 8.4C7 7.6 4.6 8 2.8 9.6M14.4 8.4c2.6-.8 5-.4 6.8 1.2",
  },
  {
    key: "natural",
    title: "Natural Hair",
    subtitle: "Wash & style, silk press, cornrows, twist outs…",
    iconPath:
      "M8.53 17.93A1.83 1.83 0 0 1 5.83 15.9A1.83 1.83 0 0 1 4.17 12.94A1.83 1.83 0 0 1 3.85 9.57A1.83 1.83 0 0 1 4.93 6.35A1.83 1.83 0 0 1 7.21 3.85A1.83 1.83 0 0 1 10.31 2.48A1.83 1.83 0 0 1 13.69 2.48A1.83 1.83 0 0 1 16.79 3.85A1.83 1.83 0 0 1 19.07 6.35A1.83 1.83 0 0 1 20.15 9.57A1.83 1.83 0 0 1 19.83 12.94A1.83 1.83 0 0 1 18.17 15.9A1.83 1.83 0 0 1 15.47 17.93M8.53 17.93V12.4a3.47 3.47 0 0 1 6.94 0v5.53",
  },
  {
    key: "treatments",
    title: "Hair Treatments",
    subtitle: "Colour, deep conditioning, keratin, relaxers…",
    iconPath: "M9 3h6v4l3 3v11H6V10l3-3zM6 15h12",
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
    iconPath: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  },
  {
    title: "Cut no-shows.",
    subtitle:
      "Take deposits or save a card, with your own cancellation policy.",
    iconPath: "M3 7h18v10H3zM3 11h18M7 15h3",
  },
  {
    title: "Get found.",
    subtitle: "Be listed on Tiwára’s House for clients searching near you.",
    iconPath: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35",
  },
  {
    title: "Keep your full price.",
    subtitle: "Clients pay the booking fee, not you.",
    iconPath:
      "M12 2v20M17 6.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 2.6 5 3.5 5 1.6 5 3.5-2.2 3-5 3-5-1.1-5-3",
  },
];

export const CHOOSER_PATHS = {
  customer: "M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  pro: "M6.5 12.5c-.8-1.2-1-2.8-1-4.5A6.5 6.5 0 0 1 12 2a6.5 6.5 0 0 1 6.5 6c0 1.7-.2 3.3-1 4.5zM10.5 12.5V15M13.5 12.5V15M4 21.5v-.5a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v.5M9 16l3 4 3-4",
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
