import type {
  FooterColumn,
  HeroStat,
  NavLink,
  ServiceCard,
  ShopCard,
  SocialLink,
  Testimonial,
} from "../types/content";
import type { ServiceCategoryKey } from "../types/domain";

export const NAV_LINKS: readonly NavLink[] = [
  { label: "Find a Stylist", href: "#", action: { kind: "search" } },
  { label: "Browse Styles", href: "#services" },
  { label: "Hair Quiz", href: "#", action: { kind: "page", page: "hairQuiz" } },
  {
    label: "For Stylists",
    href: "#",
    action: { kind: "page", page: "stylists" },
  },
  { label: "Shop", href: "#", action: { kind: "page", page: "shop" } },
  { label: "About", href: "#", action: { kind: "page", page: "about" } },
  { label: "Contact", href: "#contact" },
  {
    label: "Book now",
    href: "#",
    action: { kind: "search" },
    className: "nav-cta",
  },
];

/**
 * Hero quick-filter chips. Labels here are hero-specific and differ from both
 * the <select> and the search-overlay chips, and the last one opens the quiz
 * rather than filtering.
 */
export interface HeroChip {
  label: string;
  filter: ServiceCategoryKey | "quiz";
}

export const HERO_CHIPS: readonly HeroChip[] = [
  { label: "Knotless Braids", filter: "braids" },
  { label: "Wig Installs", filter: "wigs" },
  { label: "Locs", filter: "locs" },
  { label: "Natural Hair", filter: "natural" },
  { label: "Treatments", filter: "treatments" },
  { label: "✦ Hair Quiz", filter: "quiz" },
];

export const HERO_STATS: readonly HeroStat[] = [
  { value: "50+", label: "Stylists UK-wide" },
  { value: "5,000+", label: "Bookings completed" },
  { value: "4.9", label: "Average rating" },
];

/* Nine names; the track renders them twice so the banner can loop seamlessly. */
export const BANNER_ITEMS: readonly string[] = [
  "Box Braids",
  "Knotless Braids",
  "Goddess Locs",
  "Wig Installs",
  "Fulani Braids",
  "Senegalese Twists",
  "Starter Locs",
  "Silk Press",
  "Cornrows",
];

export const SERVICE_CARDS: readonly ServiceCard[] = [
  {
    number: "01",
    titleLines: ["Braids &", "Protective Styles"],
    description:
      "Box braids, knotless, Fulani, cornrows and more — find a specialist near you.",
    backgroundClass: "sc-bg-1",
    hint: "Find stylists",
    cta: "Find stylists",
    action: "braids",
  },
  {
    number: "02",
    titleLines: ["Wig", "Installs"],
    description:
      "Lace front, full lace, 360 wig installs and customisation. Flawless and tailored.",
    backgroundClass: "sc-bg-2",
    hint: "Find stylists",
    cta: "Find stylists",
    action: "wigs",
  },
  {
    number: "03",
    titleLines: ["Natural", "Hair Care"],
    description:
      "Wash & styles, blowouts, twist outs, and silk press treatments.",
    backgroundClass: "sc-bg-3",
    hint: "Find stylists",
    cta: "Find stylists",
    action: "natural",
  },
  {
    number: "04",
    titleLines: ["Locs &", "Twists"],
    description:
      "Starter locs, Senegalese twists, Marley twists, loc retwists and more.",
    backgroundClass: "sc-bg-4",
    hint: "Find stylists",
    cta: "Find stylists",
    action: "locs",
  },
  {
    number: "05",
    titleLines: ["Treatments"],
    description:
      "Deep conditioning, scalp treatments, protein and hot oil treatments.",
    backgroundClass: "sc-bg-5",
    hint: "Find stylists",
    cta: "Find stylists",
    action: "treatments",
  },
  {
    number: "✦ AI",
    titleLines: ["Style", "Discovery"],
    description:
      "Upload an inspo photo — our AI identifies your style, colour & length, then links you straight to booking.",
    backgroundClass: "sc-bg-6",
    hint: "Discover",
    cta: "Discover your look",
    action: "ai",
  },
];

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
  { title: "Instagram", label: "IG" },
  { title: "TikTok", label: "TT" },
  { title: "WhatsApp", label: "WA" },
  { title: "Pinterest", label: "PT" },
];

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    heading: "Styles",
    links: [
      {
        label: "Braids & Protective Styles",
        href: "#",
        searchFilter: "braids",
      },
      { label: "Wig Installs", href: "#", searchFilter: "wigs" },
      { label: "Natural Hair Care", href: "#", searchFilter: "natural" },
      { label: "Locs & Twists", href: "#", searchFilter: "locs" },
      { label: "Treatments", href: "#", searchFilter: "treatments" },
    ],
  },
  {
    heading: "Platform",
    links: [
      { label: "About us", href: "#", page: "about" },
      { label: "Find a stylist", href: "#", searchFilter: "" },
      { label: "Join as a stylist", href: "#", page: "stylists" },
      { label: "Shop", href: "#", page: "shop" },
      { label: "Blog & Journal", href: "#" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Cancellation Policy", href: "#" },
      { label: "Stylist Terms", href: "#" },
      { label: "Cookie Policy", href: "#" },
    ],
  },
];
