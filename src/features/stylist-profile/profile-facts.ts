// The profile's policy chips, contact / social links, gallery and log-in link.
import type { PublicStylist } from "../../lib/public-stylist";
import type { Stylist } from "../../types/stylist";

export interface ProfileFacts {
  depositChip: string;
  hasPayChip: boolean;
  cancelChip: string;
  cancelHours: number;
  mailto: string;
  site: string;
  siteHref: string;
  instagramHref: string;
  tiktokHref: string;
}

/** "tiwarashouse.com", "@handle" or a full link → a full link. */
const toLink = (value: string | undefined, base: string) => {
  if (!value) return "";

  return /^https?:/.test(value) ? value : base + value.replace(/^@/, "");
};

export const getProfileFacts = (
  { email, policies, site }: Stylist,
  { instagram, tiktok }: PublicStylist["socials"],
): ProfileFacts => {
  const { mode, depositPercent, refundable, freeWindowHours } = policies;

  const depositChips = {
    deposit: `${depositPercent}% deposit${refundable ? "" : ", non-refundable"}`,
    full: "Pay in full to book",
    card: "Card needed to book",
    none: "",
  };

  return {
    depositChip: depositChips[mode],
    hasPayChip: mode !== "none",
    cancelChip: `Free cancellation up to ${freeWindowHours}h`,
    cancelHours: freeWindowHours,
    mailto: email ? `mailto:${email}` : "",
    site: site || "",
    siteHref: toLink(site, "https://"),
    instagramHref: toLink(instagram, "https://www.instagram.com/"),
    tiktokHref: toLink(tiktok, "https://www.tiktok.com/@"),
  };
};

/** Cover first, then the portfolio, without duplicates or blanks. */
export const getGallery = ({ cover, portfolio = [] }: Stylist): string[] =>
  [cover, ...portfolio].filter(
    (src, index, list) => src && list.indexOf(src) === index,
  );

export const getLoginHref = (stylistId: string): string =>
  `/login?screen=cust-email&return=${encodeURIComponent(`/${stylistId}`)}`;
