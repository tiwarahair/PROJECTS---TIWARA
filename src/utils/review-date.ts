import { toLondonTime } from "./london-time";

const DAY_MS = 86_400_000;

const reviewDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  month: "short",
  year: "numeric",
});

// whole UK calendar days between two instants
const getDaysBetween = (from: string, to: string) => {
  const [fromDay, toDay] = [from, to].map((instant) =>
    Date.parse(`${toLondonTime(instant).date}T00:00:00Z`),
  );

  return Math.round(((toDay ?? 0) - (fromDay ?? 0)) / DAY_MS);
};

export const formatReviewDate = (
  createdAt: string,
  now = new Date().toISOString(),
) => {
  const days = getDaysBetween(createdAt, now);

  if (days <= 0) return "Today";

  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  if (days < 14) return "A week ago";

  if (days < 21) return "2 weeks ago";

  return reviewDate.format(new Date(createdAt));
};
