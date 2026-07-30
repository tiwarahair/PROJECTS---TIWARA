import type { ServiceCategoryKey } from "./domain";

export interface StyleTaxonomyEntry {
  key: ServiceCategoryKey;
  /** Used in the hero and search <select>s, and the footer Styles column. */
  selectLabel: string;
  /** Shorter form used on the hero chips. */
  chipLabel: string;
  /** Shorter still, used on the search overlay's filter chips. */
  filterLabel: string;
}

export interface NavLink {
  label: string;
  href: string;
  /** Nav links that open the search overlay instead of navigating. */
  opensSearch?: boolean;
  className?: string;
}

export interface HeroStat {
  value: string;
  label: string;
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

export interface HowStep {
  number: string;
  heading: string;
  body: string;
}

export interface GalleryItem {
  label: string;
  backgroundClass: string;
  filter: ServiceCategoryKey;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  detail: string;
}

export interface BookCtaStep {
  number: string;
  label: string;
}

export interface ShopCard {
  title: string;
  subtitle: string;
  imageClass: string;
  badge?: string;
  swatches: string[];
  price: string;
}

export interface JoinField {
  type: "text" | "email";
  placeholder: string;
}

export interface ValueCard {
  title: string;
  description: string;
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
}

export interface SocialLink {
  title: string;
  label: string;
}
