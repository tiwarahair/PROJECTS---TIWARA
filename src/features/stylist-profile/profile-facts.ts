// The profile's policy chips, contact / social links, gallery and log-in link.
import type { PublicStylist } from "../../lib/public-stylist";
import type { Stylist } from "../../types/stylist";
import { getSocialUrl } from "../../utils/social-handles";

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
  youtubeHref: string;
}

/** "tiwarashouse.com" or a full link → a full link. */
const toLink = (value: string | undefined) => {
  if (!value) return "";

  return /^https?:/.test(value) ? value : `https://${value}`;
};

export const getProfileFacts = (
  { email, policies, site }: Stylist,
  { instagram, tiktok, youtube }: PublicStylist["socials"],
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
    siteHref: toLink(site),
    instagramHref: getSocialUrl("instagram", instagram),
    tiktokHref: getSocialUrl("tiktok", tiktok),
    youtubeHref: getSocialUrl("youtube", youtube),
  };
};

/** Cover first, then the portfolio, without duplicates or blanks. */
export const getGallery = ({ cover, portfolio = [] }: Stylist): string[] =>
  [cover, ...portfolio].filter(
    (src, index, list) => src && list.indexOf(src) === index,
  );

export const getLoginHref = (stylistId: string): string =>
  `/login?screen=cust-email&return=${encodeURIComponent(`/${stylistId}`)}`;
