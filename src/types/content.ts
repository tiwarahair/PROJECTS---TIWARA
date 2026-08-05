import type { ServiceId } from "./services";

export interface NavLink {
  label: string;
  /** A route path, or `/#services`-style anchor on the landing page. */
  to: string;
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
  action: ServiceId | "ai";
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
  /** Absent for the legal links, which have no destination yet. */
  to?: string;
}

export interface SocialLink {
  title: string;
  label: string;
  href: string;
}
