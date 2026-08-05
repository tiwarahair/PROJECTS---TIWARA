import type {
  FooterColumn,
  NavLink,
  ShopCard,
  SocialLink,
  Testimonial,
} from "../../types/content";
import type { ServiceId } from "../../types/services";
import { capitaliseServiceId, SERVICES } from "../services/services";
import { PATH, searchPath } from "../../routes/routes";

export const NAV_LINKS: readonly NavLink[] = [
  { label: "Find a Stylist", to: PATH.search },
  // Anchors are absolute so they still work from a page other than the landing route, where the target element is not mounted yet.
  { label: "Browse Styles", to: "/#services" },
  { label: "Hair Quiz", to: PATH.hairQuiz },
  { label: "For Stylists", to: PATH.forStylists },
  { label: "Shop", to: PATH.shop },
  { label: "About", to: PATH.about },
  { label: "Contact", to: "/#contact" },
  { label: "Book now", to: PATH.book, className: "nav-cta" },
];

/**
 * Hero quick-filter chips. Labels here are hero-specific and differ from both
 * the <select> and the search-overlay chips, and the last one opens the quiz
 * rather than filtering.
 */
export interface HeroChip {
  label: string;
  filter: ServiceId | "quiz";
}

export const HERO_CHIPS: readonly HeroChip[] = [
  ...SERVICES.map(({ id }) => ({
    label:
      id === "braids"
        ? "Knotless Braids"
        : id === "wigs"
          ? "Wig Installs"
          : capitaliseServiceId(id),
    filter: id,
  })),
  { label: "✦ Hair Quiz", filter: "quiz" },
];

// TO DO: REPLACE W/ JSON, MAKE UP FOR: hint, action etc. then add on the end of array: ✦AI stuff

export const SERVICE_CARDS = [
  ...SERVICES.map(({ id, label, description }) => ({
    title: label.replace(/ (?!&)/, "\n"),
    description,
    hint: "Find stylists",
    cta: "Find stylists",
    action: id,
  })),
  {
    title: "Style Discovery",
    description:
      "Upload an inspo photo — our AI identifies your style, colour & length, then links you straight to booking.",
    hint: "Discover",
    cta: "Discover your look",
    action: "ai" as const,
  },
];

// GETTING ADDED TO THE DB IN 'REVIEW' DOC
export const TESTIMONIALS: readonly Testimonial[] = [
  {
    id: "t0",
    quote:
      "The most seamless booking experience I've ever had with a braider. Picked my style, chose my length, paid my deposit — all in five minutes. Tiwara's work is absolutely immaculate.",
    author: "Adaeze O.",
    detail: "Knotless Braids — Tiwara's House, Manchester",
  },
  {
    id: "t1",
    quote:
      "I found NaturallyNia through the platform and I'll never go back to Instagram-hunting again. Her loc work is incredible, and the whole booking process was so smooth.",
    author: "Yemi O.",
    detail: "Senegalese Twists — NaturallyNia, Birmingham",
  },
  {
    id: "t2",
    quote:
      "As someone who just moved to London, finding Amara Beauty through Tiwara's House was a lifesaver. Booked in twenty minutes, deposit sorted, and the install was flawless.",
    author: "Blessing T.",
    detail: "Lace Front Install — Amara Beauty, London",
  },
];

// TO DO: EXTRACT DATA WHEN WE START THE SHOP FEATURE
export const SHOP_CARDS: readonly ShopCard[] = [
  {
    title: "Pre-Sectioned Boho Deep Wave",
    subtitle: "Bulk braiding hair — 7 lengths",
    imageClass: "si-1",
    badge: "New",
    swatches: ["#1a1108", "#3d2000", "#7a3800", "#c07020", "#e8d080"],
    price: "£18.99",
  },
  {
    title: "Pre-Sectioned Kanekalon Braiding",
    subtitle: "Standard braiding hair — 5 lengths",
    imageClass: "si-2",
    badge: "Best seller",
    swatches: ["#1a1108", "#3d2000", "#8b3a00", "#c07020"],
    price: "£14.99",
  },
  {
    title: "Pre-Sectioned French Curl",
    subtitle: "Curl braiding hair — 4 lengths",
    imageClass: "si-3",
    swatches: ["#1a1108", "#3d2000", "#c07020"],
    price: "£16.99",
  },
  {
    title: "Hair Care Accessories",
    subtitle: "Combs, edge tools, scalp oils",
    imageClass: "si-4",
    swatches: [],
    price: "from £6.99",
  },
];

export const FOOTER_SOCIALS: readonly SocialLink[] = [
  {
    title: "Instagram",
    label: "IG",
    href: "https://www.instagram.com/tiwarashouse/",
  },
  {
    title: "TikTok",
    label: "TT",
    href: "https://www.tiktok.com/@tiwarashouse?_r=1&_t=ZN-98YLLXCFDzq",
  },
  {
    title: "Youtube",
    label: "YT",
    href: "https://www.youtube.com/@TiwarasHouse",
  },
];

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    heading: "Styles",
    links: SERVICES.map(({ id, label }) => ({
      label,
      to: searchPath({ style: id }),
    })),
  },
  {
    heading: "Platform",
    links: [
      { label: "About us", to: PATH.about },
      { label: "Find a stylist", to: PATH.search },
      { label: "Join as a stylist", to: PATH.forStylists },
      { label: "Shop", to: PATH.shop },
    ],
  },
  {
    heading: "Legal",
    links: [
      // TO DO: no destinations yet; reserved in RESERVED_SLUGS.
      { label: "Privacy Policy" },
      { label: "Terms of Service" },
      { label: "Cancellation Policy" },
      { label: "Stylist Terms" },
      { label: "Cookie Policy" },
    ],
  },
];
