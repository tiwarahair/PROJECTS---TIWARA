import type {
  PageStat,
  PageStep,
  PageValue,
} from "../../features/pages/page-blocks";

export const ABOUT_VALUES: readonly PageValue[] = [
  {
    title: "Excellence",
    description:
      "Every stylist on the platform is vetted for quality, consistency, and care. World-class craft in every appointment.",
  },
  {
    title: "Authenticity",
    description:
      "We are built from and for the community. Our platform reflects the culture — not a sanitised version of it.",
  },
  {
    title: "Community",
    description:
      "Tiwara's House lifts stylists and clients equally. When the community wins, we win.",
  },
  {
    title: "Empowerment",
    description:
      "Transparent pricing. No hidden fees. No gatekeeping. Access for everyone who needs it.",
  },
];

export const ABOUT_STEPS: readonly PageStep[] = [
  {
    number: "1",
    heading: "Search",
    body: "Enter your location and the style you're looking for. Discover vetted textured hair specialists near you.",
  },
  {
    number: "2",
    heading: "Choose your stylist",
    body: "Browse profiles, portfolios, and real client reviews. Filter by style, price, and availability.",
  },
  {
    number: "3",
    heading: "Book & confirm",
    body: "Select your exact style, customise every detail, pick a date, and pay a 25% deposit to confirm.",
  },
];

export const ABOUT_STATS: readonly PageStat[] = [
  { value: "50+", label: "Stylists UK-wide" },
  { value: "5,000+", label: "Bookings completed" },
  { value: "4.9★", label: "Average rating" },
  { value: "UK-wide", label: "Coverage & growing" },
];

export const ABOUT_MISSION =
  '"To elevate the textured hair experience — through exceptional craft, cultural authenticity, and a community that looks after its own."';

export interface StylistPerk {
  icon: string;
  title: string;
  description: string;
}

export const STYLIST_PERKS: readonly StylistPerk[] = [
  {
    icon: "📅",
    title: "Built-in booking & calendar",
    description:
      "Clients book, pay a deposit, and confirm — all without a single DM from you.",
  },
  {
    icon: "🏪",
    title: "Your own storefront",
    description:
      "A fully branded profile page with your photos, services, pricing, and client reviews.",
  },
  {
    icon: "💷",
    title: "Free to list",
    description:
      "No upfront cost. Only a small 2% platform fee per confirmed booking — nothing until you earn.",
  },
  {
    icon: "⭐",
    title: "Verified reviews",
    description:
      "Build trust with real, verified client reviews displayed prominently on your storefront.",
  },
  {
    icon: "📸",
    title: "Portfolio showcase",
    description:
      "Upload up to 30 portfolio photos organised by service. Let your work speak for itself.",
  },
  {
    icon: "🌍",
    title: "UK-wide reach",
    description:
      "Tap into a growing community of clients who know exactly what they want and are ready to book.",
  },
];

export const STYLIST_EXPERIENCE_OPTIONS: readonly string[] = [
  "Less than 1 year",
  "1–3 years",
  "3–5 years",
  "5–10 years",
  "10+ years",
];
