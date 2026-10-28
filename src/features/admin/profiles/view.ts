import type {
  AdminProfile,
  AdminProfileDetail,
  AdminProfileStats,
  ProfileFlag,
  ProfilesSort,
  ProfilesTab,
  ProfilesWentLive,
  StripeState,
} from "../../../lib/admin-api";
import { formatPence } from "../../../utils/money";
import { formatReviewDate } from "../../../utils/review-date";

const TAB_LABELS: [ProfilesTab, string, keyof AdminProfileStats][] = [
  ["all", "All", "all"],
  ["not", "Not checked", "not_checked"],
  ["flags", "Has flags", "flagged"],
  ["stripe", "Stripe needs info", "stripe"],
  ["suspended", "Suspended", "suspended"],
];

export const getTabs = (stats: AdminProfileStats | null | undefined) =>
  TAB_LABELS.map(([id, label, key]) => ({
    id,
    label,
    count: Number(stats?.[key] ?? 0),
  }));

export const SORTS = [
  ["flags", "Most flags"],
  ["newest", "Newest live"],
  ["oldest", "Oldest live"],
  ["bookings", "Most bookings"],
] as const satisfies readonly (readonly [ProfilesSort, string])[];

export const WENT_LIVE = [
  ["any", "Any time"],
  ["week", "Last 7 days"],
  ["month", "Last 30 days"],
] as const satisfies readonly (readonly [ProfilesWentLive, string])[];

export const FLAG_LABELS: Record<ProfileFlag, string> = {
  stripe: "Stripe still needs ID",
  contact: "Phone or email used elsewhere",
  prices: "Prices far above usual",
  photos: "Fewer than 6 photos",
};

export const STRIPE_LABELS: Record<StripeState, string> = {
  none: "Not set up",
  action: "Needs info",
  verifying: "Verifying",
  active: "Active",
};

export const getPriceRange = ({
  min_pence: min,
  max_pence: max,
}: AdminProfile) => {
  if (min == null || max == null) return "No prices yet";

  return min === max
    ? formatPence(min, { pence: "auto" })
    : `${formatPence(min, { pence: "auto" })} to ${formatPence(max, { pence: "auto" })}`;
};

export const getFromPrice = ({ min_pence: min }: AdminProfile) =>
  min == null ? "" : `from ${formatPence(min, { pence: "auto" })}`;

export const getCount = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

/** "4 services · from £40" beside the area */
export const getCardMeta = (profile: AdminProfile) =>
  [getCount(profile.service_count, "service"), getFromPrice(profile)]
    .filter(Boolean)
    .join(" · ");

export const getLiveAgo = ({ went_live_at: liveAt }: AdminProfile) =>
  liveAt ? formatReviewDate(liveAt) : "Not live yet";

const liveDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const formatDay = (iso: string) => liveDate.format(new Date(iso));

export const getCardFoot = (profile: AdminProfile) =>
  `${profile.owner_name} · live ${getLiveAgo(profile).toLowerCase()}`;

export const getCheckLabel = ({
  status,
  checked_at: checkedAt,
}: AdminProfile) => {
  if (status === "suspended") return "Suspended";

  return checkedAt ? "Checked" : "Not checked";
};

/** what the oldest unchecked profile is waiting since, under the stat */
export const getWaitingNote = (stats: AdminProfileStats | null | undefined) =>
  stats?.oldest_waiting
    ? `Oldest went live ${formatReviewDate(stats.oldest_waiting).toLowerCase()}`
    : "None waiting";

interface CheckRow {
  label: string;
  isOk: boolean;
  text: string;
}

const getContactText = ({ contact_matches: matches }: AdminProfileDetail) => {
  const [first] = matches;

  if (!first) return "Not used on any other account";

  const others = matches.length > 1 ? ` and ${matches.length - 1} more` : "";

  return `Same ${first.kind} as ${first.name}${others}`;
};

const getPricesText = ({ price_outliers: outliers }: AdminProfileDetail) => {
  const [first] = outliers;

  if (!first) return "In the usual range";

  return `${first.name} from ${formatPence(first.from_pence, { pence: "auto" })}, usually about ${formatPence(first.usual_pence, { pence: "auto" })}`;
};

/** the four checks in the profile sheet, in the order they're shown */
export const getChecks = (profile: AdminProfileDetail): CheckRow[] => {
  const { flags, photo_count: photos } = profile;

  return [
    {
      label: "Identity",
      isOk: !flags.includes("stripe"),
      text: flags.includes("stripe")
        ? `Stripe: ${STRIPE_LABELS[profile.stripe_state].toLowerCase()}`
        : "Verified by Stripe",
    },
    {
      label: "Phone and email",
      isOk: !flags.includes("contact"),
      text: getContactText(profile),
    },
    {
      label: "Prices",
      isOk: !flags.includes("prices"),
      text: getPricesText(profile),
    },
    {
      label: "Photos",
      isOk: !flags.includes("photos"),
      text: flags.includes("photos")
        ? `Only ${getCount(photos, "photo")}`
        : `${getCount(photos, "photo")} of their work`,
    },
  ];
};

export const getChecksLine = ({ flags }: AdminProfile) =>
  `${4 - flags.length}/4 passed`;

const STRIPE_MODE = String(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "",
).startsWith("pk_test")
  ? "test/"
  : "";

/** where bank details are checked by hand */
export const getStripeUrl = (accountId: string) =>
  `https://dashboard.stripe.com/${STRIPE_MODE}connect/accounts/${accountId}`;
