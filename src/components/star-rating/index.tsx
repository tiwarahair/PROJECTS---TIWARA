import { Star } from "lucide-react";
import styles from "../../styles/components/star-rating/index.module.css";

const STARS = [1, 2, 3, 4, 5];

interface StarRatingProps {
  rating: number;
  size?: number;
}

/** A review's stars, read-only. */
export const StarRating = ({ rating, size = 15 }: StarRatingProps) => (
  <span
    className={styles.stars}
    role="img"
    aria-label={`${rating} out of 5 stars`}
  >
    {STARS.map((star) => (
      <Star
        key={star}
        size={size}
        strokeWidth={0}
        className={star <= rating ? styles.filled : styles.empty}
      />
    ))}
  </span>
);
