import { Star } from "lucide-react";
import { StatCards } from "../../../components/stat-cards";
import type { getReviewStats } from "./view";

interface ReviewStatsProps {
  stats: ReturnType<typeof getReviewStats>;
  /** phones get one short line under each number */
  isShort: boolean;
}

/** Average rating, how many reviews, and how many have a reply. */
export const ReviewStats = ({
  stats: { rating, counted, total, checking, replied },
  isShort,
}: ReviewStatsProps) => {
  const getAverageNote = () => {
    if (rating == null)
      return isShort ? "Shows from 3" : "Shows from 3 reviews";

    return isShort
      ? `From ${counted} reviews`
      : `From ${counted} reviews in your rating`;
  };

  const getCheckingNote = () => {
    if (checking) return `${checking} being checked`;

    return isShort ? "All counted" : "All count toward your rating";
  };

  return (
    <StatCards
      isWide={!isShort}
      cards={[
        {
          label: "Average rating",
          value: (
            <>
              <Star size={22} strokeWidth={0} fill="var(--brand-yellow)" />
              {rating?.toFixed(1)}
            </>
          ),
          isEmpty: rating == null,
          sub: getAverageNote(),
        },
        { label: "Reviews", value: total, sub: getCheckingNote() },
        {
          label: "Replied to",
          value: replied,
          sub: isShort ? "Shown publicly" : "Replies show on your profile",
        },
      ]}
    />
  );
};
