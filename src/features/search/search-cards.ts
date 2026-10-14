// search_stylists rows → StylistCard props.
import { toPhotoUrl } from "../../lib/public-stylist";
import type { SearchRow } from "../../lib/search-api";
import { formatClockTime, formatWeekdayDate } from "../../utils/dates";
import { formatMoney } from "../../utils/money";
import { formatServiceDuration } from "../../utils/services";
import type { StyleSelection } from "./search-logic";

/** A matching service, as search_stylists lists them (the two cheapest). */
interface Match {
  id: string;
  name: string;
  from_pence: number;
  minutes: number;
}

/** "Today" / "Tomorrow" / "Mon 12 Oct". */
const formatDay = (date: Date): string => {
  const today = new Date().setHours(0, 0, 0, 0);

  const days = Math.round(
    (new Date(date).setHours(0, 0, 0, 0) - today) / 864e5,
  );

  if (days === 0) return "Today";

  if (days === 1) return "Tomorrow";

  return formatWeekdayDate(date);
};

const getDistanceText = ({ business_type, distance_miles }: SearchRow) => {
  if (business_type === "mobile") return "Travels to you";

  if (distance_miles == null) return "";

  if (distance_miles < 1) return "Under 1 mile away";

  const milesText = distance_miles.toFixed(1).replace(/\.0$/, "");

  return `${milesText} ${milesText === "1" ? "mile" : "miles"} away`;
};

export const toResultCards = (rows: SearchRow[], selection: StyleSelection) =>
  rows.map((row) => {
    const {
      id,
      slug,
      business_name,
      area_label,
      cover_path,
      from_pence,
      next_start,
    } = row;

    const from = from_pence / 100;
    const nextStart = next_start ? new Date(next_start) : null;
    const distanceText = getDistanceText(row);
    // jsonb, typed only as Json
    const matches = row.matches as unknown as Match[];

    return {
      key: id,
      href: `/${slug}`,
      cover: cover_path ? toPhotoUrl(cover_path) : "",
      name: business_name,
      area: area_label ?? "",
      from,
      verified: true,
      meta: `From ${formatMoney(from)}`,
      rows: selection.has
        ? matches.map((match) => ({
            name: match.name,
            meta: `from ${formatMoney(match.from_pence / 100)} · ${formatServiceDuration(match.minutes)}`,
            href: `/book?stylist=${slug}&service=${encodeURIComponent(match.id)}`,
          }))
        : [],
      facts: [
        ...(distanceText ? [{ text: distanceText }] : []),
        ...(nextStart
          ? [
              {
                text: `Next available: ${formatDay(nextStart)} ${formatClockTime(nextStart)}`,
                strong: true,
              },
            ]
          : []),
      ],
    };
  });

export type ResultCard = ReturnType<typeof toResultCards>[number];
