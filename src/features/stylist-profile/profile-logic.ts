// Derived values for Stylist Profile (including the service menu).
import { reviews as allReviews, stylists } from "../../data";
import type { Stylist } from "../../types/stylist";
import {
  formatServiceDuration,
  getCustomisationSummary,
  getFromWithFee,
  getMenu,
} from "../../utils/services";
import { formatMoney } from "../../utils/money";
import { LONG_WEEKDAYS } from "../../utils/dates";

export const DEFAULT_STYLIST_ID = "tiwaras-house";
const MENU_LIMIT = 6;

/** The stylist for ?stylist=<id>, falling back to the first stylist. */
export const getStylist = (id: string): Stylist => {
  const stylist = stylists.find((item) => item.id === id) ?? stylists[0];

  if (!stylist) throw new Error("No stylists in the seed data");

  return stylist;
};

/** Cover first, then the portfolio, without duplicates or blanks. */
export const getGallery = ({ cover, portfolio = [] }: Stylist): string[] =>
  [cover, ...portfolio].filter(
    (src, index, list) => src && list.indexOf(src) === index,
  );

export interface ServiceModal {
  name: string;
  description: string;
  price: string;
  duration: string;
  href: string;
  customisation: string;
}

interface MenuItem {
  key: string;
  name: string;
  meta: string;
  price: string;
  href: string;
  modal: ServiceModal;
}

export interface MenuGroup {
  key: string;
  name: string;
  hasName: boolean;
  items: MenuItem[];
}

export const getBookHref = (stylistId: string): string =>
  `/book?stylist=${stylistId}`;

export const getMenuGroups = (stylist: Stylist): MenuGroup[] =>
  getMenu(stylist).map(({ id, name, items }) => ({
    key: id,
    name,
    hasName: !!name,
    items: items.map((service) => {
      const price = formatMoney(getFromWithFee(service));
      const duration = formatServiceDuration(service.minutes);
      const href = `${getBookHref(stylist.id)}&service=${encodeURIComponent(service.id)}`;

      return {
        key: service.id,
        name: service.name,
        meta: duration,
        price,
        href,
        modal: {
          name: service.name,
          description: service.description,
          price: `from ${price}`,
          duration,
          href,
          customisation: getCustomisationSummary(service),
        },
      };
    }),
  }));

export const countServices = (groups: MenuGroup[]): number => {
  let total = 0;

  for (const { items } of groups) total += items.length;

  return total;
};

/** Only the first six services across all groups are listed; empty groups are dropped. */
export const limitMenuGroups = (groups: MenuGroup[]): MenuGroup[] =>
  groups
    .map((group, index) => ({
      ...group,
      items: group.items.slice(
        0,
        Math.max(0, MENU_LIMIT - countServices(groups.slice(0, index))),
      ),
    }))
    .filter(({ items }) => items.length);

export const hasMoreServices = (groups: MenuGroup[]): boolean =>
  countServices(groups) > MENU_LIMIT;

// Opening hours by weekday (0 = Sunday): [open, close] hours, null = closed
const OPEN_HOURS: Record<number, [number, number] | null> = {
  0: null,
  1: [10, 20],
  2: [10, 20],
  3: [10, 20],
  4: [10, 20],
  5: [10, 20],
  6: [9, 18],
};

const toHourLabel = (hour: number): string =>
  `${String(hour).padStart(2, "0")}:00`;

export interface OpenStatus {
  isOpen: boolean;
  nextAvailable: string;
  openLabel: string;
  openHours: string;
}

export const getOpenStatus = (now = new Date()): OpenStatus => {
  const today = OPEN_HOURS[now.getDay()];
  const minutesNow = now.getHours() * 60 + now.getMinutes();

  const isOpen =
    !!today && minutesNow >= today[0] * 60 && minutesNow < today[1] * 60;

  const opensLater = !!today && minutesNow < today[0] * 60;
  let nextDay: { name: string; from: number } | null = null;

  for (let offset = 1; offset <= 7 && !nextDay; offset++) {
    const day = (now.getDay() + offset) % 7;
    const hours = OPEN_HOURS[day];

    if (hours) nextDay = { name: LONG_WEEKDAYS[day] ?? "", from: hours[0] };
  }

  const nextDayLabel = nextDay
    ? `${nextDay.name} ${toHourLabel(nextDay.from)}`
    : "";

  let nextAvailable = "by request";
  let openHours = "";

  if (isOpen && today) {
    const fromHour =
      minutesNow / 60 < today[0]
        ? today[0]
        : Math.min(today[1] - 1, Math.ceil(minutesNow / 60) + 1);

    nextAvailable = `today from ${toHourLabel(fromHour)}`;
    openHours = `until ${toHourLabel(today[1])}`;
  } else if (opensLater && today) {
    nextAvailable = `today ${toHourLabel(today[0])}`;
    openHours = `opens ${toHourLabel(today[0])}`;
  } else if (nextDay) {
    nextAvailable = nextDayLabel;
    openHours = `opens ${nextDayLabel}`;
  }

  return {
    isOpen,
    nextAvailable,
    openLabel: isOpen ? "Open now" : "Closed",
    openHours,
  };
};

interface HoursRow {
  day: string;
  time: string;
  shut: boolean;
}

// The aside's opening hours are static rows (not OPEN_HOURS)
export const HOURS_ROWS: HoursRow[] = [
  { day: "Mon – Tue", time: "Closed" },
  { day: "Wed – Fri", time: "9:00 – 18:00" },
  { day: "Saturday", time: "8:00 – 19:00" },
  { day: "Sunday", time: "10:00 – 16:00" },
].map(({ day, time }) => ({ day, time, shut: time === "Closed" }));

export interface ProfileFacts {
  depositChip: string;
  hasPayChip: boolean;
  cancelChip: string;
  cancelHours: number;
  mailto: string;
  site: string;
  siteHref: string;
}

const getSiteHref = (site?: string): string => {
  if (!site) return "";

  return /^https?:/.test(site) ? site : `https://${site}`;
};

export const getProfileFacts = ({
  id,
  policies,
  site,
}: Stylist): ProfileFacts => {
  const { mode, depositPercent, refundable, freeWindowHours } = policies;

  const depositChips = {
    deposit: `${depositPercent}% deposit${refundable ? "" : ", non-refundable"}`,
    full: "Pay in full to book",
    card: "Card needed to book",
    none: "",
  };

  const handle = id.replace(/-/g, "");

  return {
    depositChip: depositChips[mode],
    hasPayChip: mode !== "none",
    cancelChip: `Free cancellation up to ${freeWindowHours}h`,
    cancelHours: freeWindowHours,
    mailto: `mailto:${handle}@tiwarashouse.co.uk`,
    site: site || "",
    siteHref: getSiteHref(site),
  };
};

export interface ReviewView {
  key: string;
  name: string;
  text: string;
  style: string;
  starFills: string[];
}

export const getReviews = (): ReviewView[] =>
  allReviews.map(({ name, text, style, stars }, index) => ({
    key: String(index),
    name,
    text,
    style,
    starFills: [1, 2, 3, 4, 5].map((star) =>
      star <= stars ? "var(--brand-yellow)" : "var(--neutral-300)",
    ),
  }));

export const getLoginHref = (stylistId: string): string => {
  const returnPath = encodeURIComponent(`/stylist?stylist=${stylistId}`);

  return `/login?screen=cust-email&return=${returnPath}`;
};
