import type { ServiceCategoryKey } from "./domain";
import type { SimpleOverlayId } from "./overlays";

export interface StyleTaxonomyEntry {
  key: ServiceCategoryKey;
  /** Used in the hero and search <select>s, and the footer Styles column. */
  selectLabel: string;
  /** Shorter form used on the hero chips. */
  chipLabel: string;
  /** Shorter still, used on the search overlay's filter chips. */
  filterLabel: string;
}

/** What a nav link does instead of following its href. */
export type NavAction =
  { kind: "search" } | { kind: "page"; page: SimpleOverlayId };

export interface NavLink {
  label: string;
  href: string;
  /** Omitted for plain anchor links such as #services and #contact. */
  action?: NavAction;
  className?: string;
}

export interface ServiceCard {
  number: string;
  /** Rendered across two lines; the original used a <br>. */
  titleLines: string[];
  description: string;
  backgroundClass: string;
  hint: string;
  cta: string;
  /** Category to filter by, or "ai" for the Style Discovery tile. */
  action: ServiceCategoryKey | "ai";
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  detail: string;
}

export interface ShopCard {
  title: string;
  subtitle: string;
  imageClass: string;
  badge?: string;
  swatches: string[];
  price: string;
}

export interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

export interface FooterLink {
  label: string;
  href: string;
  /** Present when the link opens search filtered to a category. */
  searchFilter?: ServiceCategoryKey | "";
  /** Present when the link opens one of the full-page overlays. */
  page?: SimpleOverlayId;
}

export interface SocialLink {
  title: string;
  label: string;
}
