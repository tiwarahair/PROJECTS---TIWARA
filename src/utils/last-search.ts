// "Back to results" memory shared by Search and Stylist Profile.
import type { Catalogue } from "../types/catalogue";
import { readSession, writeSession } from "./page-flags";
import { formatWeekdayDate } from "./dates";

export const LAST_SEARCH_KEY = "tw_last_search";
export const SEARCH_SCROLL_KEY = "tw_search_y";
export const SEARCH_BACK_KEY = "tw_search_back";

export interface LastSearch {
  has: boolean;
  href: string;
  label: string;
  summary: string | null;
}

const findName = (list: { id: string; name: string }[], value: string) =>
  list.find(({ id }) => id === value)?.name || value;

const getSearchWhat = (
  { groups, types }: Catalogue,
  type: string | null,
  group: string | null,
  query: string | null,
) => {
  if (type) return findName(types, type);

  if (group) return findName(groups, group);

  if (query) return `‘${query}’`;

  return "All styles";
};

/** "Knotless braids · Chorlton · Sat 12 Sep, Morning" */
export const getSearchSummary = (
  href: string,
  catalogue: Catalogue,
): string => {
  const params = new URLSearchParams(href.split("?")[1] || "");
  const group = params.get("group") || params.get("service");
  const type = params.get("type");
  const query = params.get("q");
  const what = getSearchWhat(catalogue, type, group, query);
  const where = params.get("loc") || "Current location";
  const date = params.get("date");
  const time = params.get("time");
  let when = "";

  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date))
    when = formatWeekdayDate(new Date(`${date}T12:00`));

  if (time && time !== "any")
    when +=
      (when ? ", " : "") +
      time.charAt(0).toUpperCase() +
      time.slice(1).replace("-", "–");

  return [what, where, when || "Any time"].join(" · ");
};

export const getLastSearch = (catalogue?: Catalogue): LastSearch => {
  const href = readSession(LAST_SEARCH_KEY);

  if (!href)
    return {
      has: false,
      href: "/search",
      label: "Find a stylist",
      summary: "",
    };

  return {
    has: true,
    href,
    label: "Back to results",
    summary: catalogue ? getSearchSummary(href, catalogue) : null,
  };
};

/** Marks the next Search visit as a "back" so it restores the saved scroll position. */
export const markSearchBack = (): void => {
  if (readSession(LAST_SEARCH_KEY)) writeSession(SEARCH_BACK_KEY, "1");
};
